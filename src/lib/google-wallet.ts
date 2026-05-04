import { google } from 'googleapis';
import path from 'path';
import jwt from 'jsonwebtoken';
import fs from 'fs';

// Increment this whenever the card image design changes — forces Google Wallet to re-fetch
const IMAGE_VERSION = '8';

// Initialize Google Auth
const getAuth = () => {
  const serviceAccountVar = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  
  if (serviceAccountVar) {
    try {
      const credentials = JSON.parse(serviceAccountVar);
      return new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
      });
    } catch (e) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:', e);
    }
  }

  const keyFilePath = path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS || 'marketif-loyalty-db92eeb98711.json');
  
  return new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
  });
};

const auth = getAuth();
const issuerId = process.env.GOOGLE_ISSUER_ID || '';


export const walletClient = google.walletobjects({
  version: 'v1',
  auth: auth,
});

/**
 * Creates a generic LoyaltyClass for the Marketif Loyalty system
 */
export async function createLoyaltyClass(classId: string, merchantName: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const isAroma = classId.includes('aroma');

  const sharedFields = {
    issuerName: merchantName,
    programName: isAroma ? 'Mit Liebe serviert. Treue belohnt.' : `${merchantName} Treueprogramm`,
    programLogo: {
      sourceUri: {
        uri: `${appUrl}/api/images/logo`,
      },
    },
    hexBackgroundColor: '#1A3828',
    ...(appUrl && !appUrl.includes('localhost')
      ? { heroImage: { sourceUri: { uri: `${appUrl}/api/images/card/0?v=${IMAGE_VERSION}` } } }
      : {}),
    locations: [{ latitude: 48.3715, longitude: 10.8985 }],
  };

  // reviewStatus only for initial insert — cannot be patched on existing classes
  const insertData = { id: `${issuerId}.${classId}`, ...sharedFields, reviewStatus: 'UNDER_REVIEW' };

  try {
    const response = await walletClient.loyaltyclass.insert({
      requestBody: insertData,
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 409) {
      // Klasse existiert bereits – mit neuen Einstellungen patchen
      try {
        const patchResponse = await walletClient.loyaltyclass.patch({
          resourceId: `${issuerId}.${classId}`,
          requestBody: sharedFields,
        });
        return patchResponse.data;
      } catch (patchError: any) {
        console.log('Class patch skipped:', patchError.message);
        return { id: `${issuerId}.${classId}` };
      }
    }
    throw error;
  }
}

/**
 * Generates the JWT link to "Add to Google Wallet"
 */
export async function generateLoyaltyObjectJwt(classId: string, objectId: string, points: number) {
  let credentials;
  const serviceAccountVar = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  
  if (serviceAccountVar) {
    credentials = JSON.parse(serviceAccountVar);
  } else {
    const keyFilePath = path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS || 'marketif-loyalty-db92eeb98711.json');
    credentials = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));
  }

  const privateKey = credentials.private_key;
  const clientEmail = credentials.client_email;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

  const newObject = {
    id: `${issuerId}.${objectId}`,
    classId: `${issuerId}.${classId}`,
    state: 'ACTIVE',
    accountId: objectId,
    accountName: 'Stammgast ⭐',
    barcode: {
      type: 'QR_CODE',
      value: objectId,
      alternateText: objectId.substring(0, 8),
    },
    loyaltyPoints: {
      label: 'Stempel',
      balance: {
        int: points,
      },
    },
    ...(appUrl && !appUrl.includes('localhost')
      ? {
          heroImage: {
            sourceUri: { uri: `${appUrl}/api/images/card/${points}?v=${IMAGE_VERSION}` },
          },
        }
      : {}),
    textModulesData: [
      {
        id: 'address',
        header: 'Adresse',
        body: 'Steingasse 7, 86150 Augsburg',
      },
      {
        id: 'status',
        header: 'Status',
        body: 'Willkommen bei Restaurant Aroma! 👋',
      },
    ],
    linksModuleData: {
      uris: [],
    },
  };

  const claims = {
    iss: clientEmail,
    aud: 'google',
    origins: [],
    typ: 'savetowallet',
    payload: {
      loyaltyObjects: [newObject],
    },
  };

  const token = jwt.sign(claims, privateKey, { algorithm: 'RS256' });
  return `https://pay.google.com/gp/v/save/${token}`;
}

/**
 * Updates an existing LoyaltyObject (e.g. after adding a stamp)
 */
export async function updateLoyaltyObjectPoints(objectId: string, points: number, isRedeem: boolean = false) {
  try {
    const issuerId = process.env.GOOGLE_ISSUER_ID;
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const isPublicUrl = appUrl && !appUrl.includes('localhost');

    const heroImageUri = isRedeem
      ? 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1000&q=80'
      : `${appUrl}/api/images/card/${points}?v=${IMAGE_VERSION}`;

    const updatedObject: any = {
      loyaltyPoints: {
        balance: { int: points },
        label: 'Stempel',
      },
      ...(isPublicUrl || isRedeem
        ? { heroImage: { sourceUri: { uri: heroImageUri } } }
        : {}),
      textModulesData: [
        {
          id: 'address',
          header: 'Adresse',
          body: 'Steingasse 7, 86150 Augsburg',
        },
        {
          id: 'status',
          header: 'Status',
          body: isRedeem
            ? 'GRATIS KAFFEE ERHALTEN! ☕'
            : points >= 9
            ? 'FAST GESCHAFFT! Nur noch 1 Stempel! 🎉'
            : points >= 5
            ? 'HALBZEIT! Du bist auf dem Weg! 🚀'
            : 'Willkommen bei Restaurant Aroma! 👋',
        },
      ]
    };

    // Add Review Link only if they just redeemed or have many points
    if (isRedeem || points >= 10) {
      updatedObject.linksModuleData = {
        uris: [
          {
            uri: 'https://search.google.com/local/writereview?placeid=PLACEHOLDER', // Placeholder
            description: 'Jetzt bewerten & Feedback geben ⭐',
          }
        ]
      };
      
      // Trigger a notification message
      updatedObject.messages = [
        {
          header: 'Belohnung bereit! ✨',
          body: 'Herzlichen Glückwunsch! Du hast deine Stempelkarte voll. Zeige sie beim nächsten Mal vor.',
          id: 'REDEEM_MESSAGE',
          messageType: 'TEXT_AND_NOTIFY'
        }
      ];
    }

    const response = await walletClient.loyaltyobject.patch({
      resourceId: `${issuerId}.${objectId}`,
      requestBody: updatedObject,
    });
    return response.data;
  } catch (error: any) {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
}
