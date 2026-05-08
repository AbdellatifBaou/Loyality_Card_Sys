import { google } from 'googleapis';
import path from 'path';
import jwt from 'jsonwebtoken';
import fs from 'fs';

// Increment this whenever the card image design changes — forces Google Wallet to re-fetch
const IMAGE_VERSION = '10';

// Safely parse service account JSON, fixing newline corruption from env vars
function parseCredentials(raw: string) {
  const creds = JSON.parse(raw);
  // Normalize private key: replace literal newlines with \n if needed
  if (creds.private_key) {
    creds.private_key = creds.private_key
      .replace(/\r\n/g, '\n')  // Windows CRLF -> LF
      .replace(/\\n/g, '\n');   // Escaped \n -> real newline (double-escaped)
  }
  return creds;
}

// Initialize Google Auth
const getAuth = () => {
  const serviceAccountVar = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  
  if (serviceAccountVar) {
    try {
      const credentials = parseCredentials(serviceAccountVar);
      return new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
      });
    } catch (e) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:', e);
    }
  }

  const keyFilePath = path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS || 'marketif-loyality-53d9fef6c323.json');
  
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
export async function createLoyaltyClass(classId: string, merchant: any) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

  const sharedFields = {
    issuerName: merchant.name,
    programName: `${merchant.name} Treueprogramm`,
    programLogo: {
      sourceUri: {
        uri: merchant.logo_url || `${appUrl}/api/images/logo`,
      },
    },
    hexBackgroundColor: merchant.primary_color || '#1A3828',
    ...(appUrl && !appUrl.includes('localhost')
      ? { heroImage: { sourceUri: { uri: `${appUrl}/api/images/card/0?v=${IMAGE_VERSION}&merchant=${merchant.slug}` } } }
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
export async function generateLoyaltyObjectJwt(classId: string, objectId: string, points: number, merchant: any) {
  let credentials;
  const serviceAccountVar = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  
  if (serviceAccountVar) {
    credentials = parseCredentials(serviceAccountVar);
  } else {
    const keyFilePath = path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS || 'marketif-loyality-53d9fef6c323.json');
    credentials = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));
  }

  // Ensure private key has proper newlines for JWT signing
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
            sourceUri: { uri: `${appUrl}/api/images/card/${points}?v=${IMAGE_VERSION}&merchant=${merchant.slug}` },
          },
        }
      : {}),
    textModulesData: [
      {
        id: 'address',
        header: 'Adresse',
        body: merchant.address || 'Adresse unbekannt',
      },
      {
        id: 'status',
        header: 'Status',
        body: `Willkommen bei ${merchant.name}! 👋`,
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
export async function updateLoyaltyObjectPoints(objectId: string, points: number, isRedeem: boolean = false, merchant: any) {
  try {
    const issuerId = process.env.GOOGLE_ISSUER_ID;
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const isPublicUrl = appUrl && !appUrl.includes('localhost');

    const heroImageUri = isRedeem
      ? `${appUrl}/api/images/redeem?v=${IMAGE_VERSION}&merchant=${merchant?.slug}`
      : `${appUrl}/api/images/card/${points}?v=${IMAGE_VERSION}&merchant=${merchant?.slug}`;

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
          body: merchant?.address || 'Adresse unbekannt',
        },
        {
          id: 'status',
          header: 'Status',
          body: isRedeem
            ? 'GRATIS BELOHNUNG ERHALTEN! 🎁'
            : points >= 10
            ? 'DEINE BELOHNUNG IST BEREIT! 🎁'
            : points >= 9
            ? 'FAST GESCHAFFT! Nur noch 1 Stempel! 🎉'
            : points >= 5
            ? 'HALBZEIT! Du bist auf dem Weg! 🚀'
            : `Willkommen bei ${merchant?.name || 'uns'}! 👋`,
        },
      ]
    };

    // Always add a notify message to force Google Wallet to refresh the pass on the device
    if (isRedeem || points >= 10) {
      updatedObject.linksModuleData = {
        uris: [
          {
            uri: 'https://search.google.com/local/writereview?placeid=PLACEHOLDER',
            description: 'Jetzt bewerten & Feedback geben ⭐',
          }
        ]
      };
      updatedObject.messages = [
        {
          header: 'Belohnung bereit! ✨',
          body: merchant?.reward_text || 'Herzlichen Glückwunsch! Du hast deine Stempelkarte voll. Zeige sie beim nächsten Mal vor.',
          id: `REDEEM_MESSAGE_${Date.now()}`,
          messageType: 'TEXT_AND_NOTIFY'
        }
      ];
    } else {
      // For regular stamps: send a silent notify to force the pass to refresh
      updatedObject.messages = [
        {
          header: `${points} von 10 Stempeln 🍕`,
          body: points >= 9
            ? 'Nur noch 1 Stempel bis zu deiner Gratisbelohnung! 🎉'
            : `Du hast ${points} Stempel gesammelt. Weiter so!`,
          id: `STAMP_MESSAGE_${Date.now()}`,
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
