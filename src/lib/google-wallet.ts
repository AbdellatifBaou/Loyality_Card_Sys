import { google } from 'googleapis';
import path from 'path';
import jwt from 'jsonwebtoken';
import fs from 'fs';

// Increment this whenever the card image design changes — forces Google Wallet to re-fetch
const IMAGE_VERSION = '10';

// Normalize App URL: remove trailing slash if present
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');

// Safely parse service account JSON, fixing newline corruption from env vars
function normalizePrivateKey(key: string): string {
  if (!key) return key;

  // Step 1: Remove potential surrounding quotes and cleanup whitespace
  let cleaned = key.trim().replace(/^["']|["']$/g, '');

  // Step 2: Extract the raw base64 data by removing headers, footers and any newline characters
  // This handles keys that were flattened into a single line or mangled by env var managers
  let base64 = cleaned
    .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/g, '')
    .replace(/-----END (RSA )?PRIVATE KEY-----/g, '')
    .replace(/\\n/g, '')
    .replace(/\s+/g, '');

  // Step 3: Reconstruct the PEM format properly with 64-character line breaks
  // Some Node.js versions/OpenSSL are extremely strict and require this format
  const matches = base64.match(/.{1,64}/g);
  const formattedBase64 = matches ? matches.join('\n') : base64;

  return `-----BEGIN PRIVATE KEY-----\n${formattedBase64}\n-----END PRIVATE KEY-----\n`;
}

function parseCredentials(raw: string) {
  try {
    // Handle double-stringified JSON (happens on some platforms)
    let parsed = JSON.parse(raw);
    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed);
    }
    
    if (parsed.private_key) {
      parsed.private_key = normalizePrivateKey(parsed.private_key);
    }
    return parsed;
  } catch (e) {
    // If JSON.parse fails, the env var might have unescaped newlines in the private key
    // or it might be wrapped in quotes that JSON.parse doesn't like as a root
    try {
      const cleaned = raw.trim().replace(/^["']|["']$/g, '');
      const fixed = cleaned.replace(
        /"private_key"\s*:\s*"([\s\S]+?)(?=",\s*"client_email|",\s*"client_id)"/,
        (_match, key) => `"private_key": "${key.replace(/\n/g, '\\n')}"`
      );
      const parsed = JSON.parse(fixed);
      if (parsed.private_key) {
        parsed.private_key = normalizePrivateKey(parsed.private_key);
      }
      return parsed;
    } catch (e2) {
      throw new Error(`Failed to parse service account JSON: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

/**
 * Diagnostic helper to check auth state without exposing secrets
 */
export function getWalletDiagnostics() {
  try {
    const credentials = getCredentials();
    return {
      source: process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? 'env' : 'file',
      projectId: credentials.project_id,
      clientEmail: credentials.client_email,
      hasPrivateKey: !!credentials.private_key,
      privateKeyLength: credentials.private_key?.length || 0,
      privateKeyStart: credentials.private_key?.substring(0, 30),
      issuerId: process.env.GOOGLE_ISSUER_ID || 'missing',
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'missing'
    };
  } catch (e: any) {
    return { error: e.message };
  }
}

// Get Credentials from env var (string) or file path
function getCredentials() {
  const serviceAccountVar = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  let credentials;
  
  if (serviceAccountVar && serviceAccountVar.trim()) {
    console.log('Google Wallet: Using credentials from GOOGLE_SERVICE_ACCOUNT_KEY environment variable.');
    credentials = parseCredentials(serviceAccountVar);
  } else {
    const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || 'marketif-loyality-389b67921d03.json';
    const keyFilePath = path.resolve(process.cwd(), keyFile);
    
    if (!fs.existsSync(keyFilePath)) {
      console.error(`Google Wallet: Service account key file NOT found at: ${keyFilePath}`);
      throw new Error(`Service account key file not found at: ${keyFilePath}. Please set GOOGLE_SERVICE_ACCOUNT_KEY env var with JSON content.`);
    }

    try {
      console.log(`Google Wallet: Using credentials from file: ${keyFile}`);
      credentials = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));
    } catch (e) {
      throw new Error(`Failed to read/parse key file at ${keyFilePath}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Crucial: Always ensure the private key is normalized for JWT signing,
  // regardless of where it was loaded from.
  if (credentials && credentials.private_key) {
    credentials.private_key = normalizePrivateKey(credentials.private_key);
  }

  return credentials;
}

// Initialize Google Auth
const getAuth = () => {
  try {
    const credentials = getCredentials();
    return new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
    });
  } catch (e) {
    console.error('Google Auth initialization failed:', e);
    // Return a dummy auth that will fail gracefully on use if we can't initialize
    return new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
    });
  }
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
    locations: merchant.latitude && merchant.longitude 
      ? [{ latitude: merchant.latitude, longitude: merchant.longitude }]
      : [{ latitude: 48.3715, longitude: 10.8985 }],
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
  const credentials = getCredentials();

  // Ensure private key has proper newlines for JWT signing
  const privateKey = credentials.private_key;
  const clientEmail = credentials.client_email;

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
    origins: [appUrl],
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    payload: {
      loyaltyObjects: [newObject],
    },
  };

  const token = jwt.sign(claims, privateKey, { 
    algorithm: 'RS256',
    keyid: credentials.private_key_id 
  });
  return `https://pay.google.com/gp/v/save/${token}`;
}

/**
 * Updates an existing LoyaltyObject (e.g. after adding a stamp)
 */
export async function updateLoyaltyObjectPoints(objectId: string, points: number, isRedeem: boolean = false, merchant: any) {
  try {
    const issuerId = process.env.GOOGLE_ISSUER_ID;
    const isPublicUrl = appUrl && !appUrl.includes('localhost');

    const heroImageUri = points >= 9
      ? `${appUrl}/api/images/redeem?v=${IMAGE_VERSION}&merchant=${merchant?.slug}`
      : `${appUrl}/api/images/card/${points}?v=${IMAGE_VERSION}&merchant=${merchant?.slug}`;

    const updatedObject: any = {
      loyaltyPoints: {
        balance: { int: points },
        label: 'Stempel',
      },
      ...(isPublicUrl
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
            ? 'Prämie erfolgreich eingelöst! 🎉'
            : points >= 9
            ? 'DEINE BELOHNUNG IST BEREIT! 🎁'
            : points >= 8
            ? 'FAST GESCHAFFT! Nur noch 1 Stempel! 🎉'
            : points >= 5
            ? 'HALBZEIT! Du bist auf dem Weg! 🚀'
            : `Willkommen bei ${merchant?.name || 'uns'}! 👋`,
        },
      ]
    };

    // Always add a notify message to force Google Wallet to refresh the pass on the device
    if (isRedeem) {
      updatedObject.messages = [
        {
          header: 'Prämie eingelöst! 🍕',
          body: 'Guten Appetit! Deine Karte wurde auf 0 zurückgesetzt, du kannst nun wieder neu sammeln.',
          id: `REDEEM_MESSAGE_${Date.now()}`,
          messageType: 'TEXT_AND_NOTIFY'
        }
      ];
    } else if (points >= 9) {
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
          id: `REWARD_READY_MESSAGE_${Date.now()}`,
          messageType: 'TEXT_AND_NOTIFY'
        }
      ];
    } else {
      // For regular stamps: send a silent notify to force the pass to refresh
      updatedObject.messages = [
        {
          header: `${points} von 9 Stempeln 🍕`,
          body: points >= 8
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

/**
 * Sends a push notification message to all objects associated with a LoyaltyClass.
 */
export async function sendClassMessage(classId: string, header: string, body: string) {
  try {
    const issuerId = process.env.GOOGLE_ISSUER_ID;
    
    // We add a new message to the class. Google Wallet handles distributing it to all associated objects.
    const message = {
      header: header,
      body: body,
      id: `MARKETING_MESSAGE_${Date.now()}`,
      messageType: 'TEXT_AND_NOTIFY'
    };

    const response = await walletClient.loyaltyclass.addmessage({
      resourceId: `${issuerId}.${classId}`,
      requestBody: {
        message: message
      }
    });
    
    return response.data;
  } catch (error: any) {
    console.error('API Error sending class message:', error.response?.data || error.message);
    throw error;
  }
}
