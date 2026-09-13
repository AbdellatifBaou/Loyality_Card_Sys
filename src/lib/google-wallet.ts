import { google } from 'googleapis';
import path from 'path';
import jwt from 'jsonwebtoken';
import fs from 'fs';

// Increment this whenever the card image design changes — forces Google Wallet to re-fetch

const DICT = {
  de: {
    stamp: "Stempel",
    address: "Adresse",
    status: "Status",
    redeemHeader: "Prämie eingelöst! ",
    rewardHeader: "Belohnung bereit! ✨",
    defaultStampHeader1: " von 9 Stempeln ",
    defaultStampBodyNear: "Nur noch 1 Stempel bis zu deiner Gratisbelohnung! 🎉",
    defaultStampBody: "Du hast ",
    defaultStampBody2: " Stempel gesammelt. Weiter so!",
    statusRedeemed: "Prämie erfolgreich eingelöst! 🎉",
    statusReady: "DEINE BELOHNUNG IST BEREIT! 🎉",
    statusAlmost: "FAST GESCHAFFT! Nur noch 1 Stempel! 🎉",
    statusHalfway: "HALBZEIT! Du bist auf dem Weg! 🚀",
    statusWelcome: "Willkommen bei {name}! 👋",
    redeemBody: "Viel Spaß mit deiner Prämie! Deine Karte wurde auf 0 zurückgesetzt, du kannst nun wieder neu sammeln.",
    rewardBody: "Herzlichen Glückwunsch! Du hast deine Stempelkarte voll. Zeige sie beim nächsten Mal vor.",
    reviewText: "Jetzt bewerten & Feedback geben ⭐",
    programNameSuffix: " Treueprogramm",
    accountNameDefault: "Stammgast ⭐",
    addressUnknown: "Adresse unbekannt"
  },
  en: {
    stamp: "Stamps",
    address: "Address",
    status: "Status",
    redeemHeader: "Reward redeemed! ",
    rewardHeader: "Reward ready! ✨",
    defaultStampHeader1: " of 9 stamps ",
    defaultStampBodyNear: "Only 1 stamp left until your free reward! 🎉",
    defaultStampBody: "You have collected ",
    defaultStampBody2: " stamps. Keep it up!",
    statusRedeemed: "Reward successfully redeemed! 🎉",
    statusReady: "YOUR REWARD IS READY! 🎉",
    statusAlmost: "ALMOST THERE! Only 1 stamp left! 🎉",
    statusHalfway: "HALFWAY! You are on your way! 🚀",
    statusWelcome: "Welcome to {name}! 👋",
    redeemBody: "Enjoy your reward! Your card has been reset to 0, you can start collecting again.",
    rewardBody: "Congratulations! Your stamp card is full. Show it on your next visit.",
    reviewText: "Rate us & give feedback ⭐",
    programNameSuffix: " Loyalty Program",
    accountNameDefault: "Regular Customer ⭐",
    addressUnknown: "Address unknown"
  },
  fr: {
    stamp: "Tampons",
    address: "Adresse",
    status: "Statut",
    redeemHeader: "Récompense réclamée! ",
    rewardHeader: "Récompense prête! ✨",
    defaultStampHeader1: " sur 9 tampons ",
    defaultStampBodyNear: "Plus qu'1 tampon avant votre récompense gratuite! 🎉",
    defaultStampBody: "Vous avez collecté ",
    defaultStampBody2: " tampons. Continuez comme ça!",
    statusRedeemed: "Récompense utilisée avec succès ! 🎉",
    statusReady: "VOTRE RÉCOMPENSE EST PRÊTE ! 🎉",
    statusAlmost: "PRESQUE LÀ ! Plus qu'1 tampon ! 🎉",
    statusHalfway: "À MOITIÉ ! Vous êtes sur la bonne voie ! 🚀",
    statusWelcome: "Bienvenue chez {name} ! 👋",
    redeemBody: "Profitez de votre récompense ! Votre carte a été remise à zéro, vous pouvez recommencer à collecter.",
    rewardBody: "Félicitations ! Votre carte de fidélité est pleine. Présentez-la lors de votre prochaine visite.",
    reviewText: "Évaluez-nous & donnez votre avis ⭐",
    programNameSuffix: " Programme de fidélité",
    accountNameDefault: "Client régulier ⭐",
    addressUnknown: "Adresse inconnue"
  }
};

const IMAGE_VERSION = '13';

// Normalize App URL: remove trailing slash if present
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');

// Safely parse service account JSON, fixing newline corruption from env vars
function normalizePrivateKey(key: string): string {
  if (!key) return key;

  // Step 1: Remove potential surrounding quotes and cleanup whitespace
  let cleaned = key.trim().replace(/^["']|["']$/g, '');

  // Step 2: Extract the raw base64 data by removing headers, footers and any newline characters
  let base64 = cleaned
    .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/g, '')
    .replace(/-----END (RSA )?PRIVATE KEY-----/g, '')
    .replace(/\\n/g, '')
    .replace(/\s+/g, '');

  // Step 3: Reconstruct the PEM format properly with 64-character line breaks
  const matches = base64.match(/.{1,64}/g);
  const formattedBase64 = matches ? matches.join('\n') : base64;

  return `-----BEGIN PRIVATE KEY-----\n${formattedBase64}\n-----END PRIVATE KEY-----`;
}

function parseCredentials(raw: string) {
  try {
    let parsed = JSON.parse(raw);
    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed);
    }
    
    if (parsed.private_key) {
      parsed.private_key = normalizePrivateKey(parsed.private_key);
    }
    return parsed;
  } catch (e) {
    try {
      const cleaned = raw.trim().replace(/^["']|["']$/g, '');
      const fixed = cleaned.replace(
        /"private_key"\s*:\s*"([\s\S]+?)(?="\s*,\s*"client_email|",\s*"client_id)"/,
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
 * Updates an existing LoyaltyClass on Google Wallet
 */
export async function updateLoyaltyClass(classId: string, merchant: any) {
  const lang = merchant?.language || 'de';
  const t = DICT[lang as keyof typeof DICT] || DICT.de;

  const sharedFields: any = {
    issuerName: merchant.name,
    programName: `${merchant.name}${t.programNameSuffix}`,
    hexBackgroundColor: merchant.primary_color || '#1A3828',
  };

  if (merchant.logo_url) {
    sharedFields.programLogo = {
      sourceUri: {
        uri: `${appUrl}/api/images/logo?slug=${merchant.slug}`
      }
    };
  }

  if (appUrl && !appUrl.includes('localhost')) {
    sharedFields.heroImage = {
      sourceUri: {
        uri: `${appUrl}/api/images/card/0?v=${IMAGE_VERSION}&rev=${merchant?.push_settings?.hero_image?.length || 0}&merchant=${merchant.slug}`
      }
    };
  }

  if (merchant.latitude && merchant.longitude) {
    sharedFields.locations = [{ latitude: merchant.latitude, longitude: merchant.longitude }];
  }

  try {
    const patchResponse = await walletClient.loyaltyclass.patch({
      resourceId: `${issuerId}.${classId}`,
      requestBody: sharedFields,
    });
    return patchResponse.data;
  } catch (error: any) {
    console.error('[GoogleWallet] Class patch error:', error.response?.data || error.message);
    try {
      // Fallback: minimal update with programName, issuerName, and hexBackgroundColor
      const fallbackResponse = await walletClient.loyaltyclass.patch({
        resourceId: `${issuerId}.${classId}`,
        requestBody: {
          issuerName: merchant.name,
          programName: `${merchant.name}${t.programNameSuffix}`,
          hexBackgroundColor: merchant.primary_color || '#1A3828',
        },
      });
      return fallbackResponse.data;
    } catch (fallbackError: any) {
      console.error('[GoogleWallet] Fallback patch error:', fallbackError.response?.data || fallbackError.message);
      return { id: `${issuerId}.${classId}` };
    }
  }
}

/**
 * Creates a generic LoyaltyClass for the Marketif Loyalty system
 */
export async function createLoyaltyClass(classId: string, merchant: any) {
  const lang = merchant.language || 'de';
  const t = DICT[lang as keyof typeof DICT] || DICT.de;

  const sharedFields: any = {
    issuerName: merchant.name,
    programName: `${merchant.name}${t.programNameSuffix}`,
    programLogo: {
      sourceUri: {
        uri: merchant.logo_url 
          ? `${appUrl}/api/images/logo?slug=${merchant.slug}`
          : `${appUrl}/Aroma_logo.png`
      },
    },
    hexBackgroundColor: merchant.primary_color || '#1A3828',
    ...(appUrl && !appUrl.includes('localhost')
      ? { heroImage: { sourceUri: { uri: `${appUrl}/api/images/card/0?v=${IMAGE_VERSION}&rev=${merchant?.push_settings?.hero_image?.length || 0}&merchant=${merchant.slug}` } } }
      : {}),
    locations: merchant.latitude && merchant.longitude 
      ? [{ latitude: merchant.latitude, longitude: merchant.longitude }]
      : [{ latitude: 48.3715, longitude: 10.8985 }],
  };

  const insertData = { id: `${issuerId}.${classId}`, ...sharedFields, reviewStatus: 'UNDER_REVIEW' };

  try {
    const response = await walletClient.loyaltyclass.insert({
      requestBody: insertData,
    });
    return response.data;
  } catch (error: any) {
    // If class already exists, always update/patch it to latest merchant settings
    return await updateLoyaltyClass(classId, merchant);
  }
}

/**
 * Generates the JWT link to "Add to Google Wallet"
 */
export async function generateLoyaltyObjectJwt(classId: string, objectId: string, points: number, merchant: any) {
  const lang = merchant?.language || 'de';
  const t = DICT[lang as keyof typeof DICT] || DICT.de;
  const credentials = getCredentials();

  // Ensure private key has proper newlines for JWT signing
  const privateKey = credentials.private_key;
  const clientEmail = credentials.client_email;

  const newObject = {
    id: `${issuerId}.${objectId}`,
    classId: `${issuerId}.${classId}`,
    state: 'ACTIVE',
    accountId: objectId,
    accountName: t.accountNameDefault || 'Stammgast ⭐',
    barcode: {
      type: 'QR_CODE',
      value: objectId,
      alternateText: objectId.substring(0, 8),
    },
    loyaltyPoints: {
      label: t.stamp,
      balance: {
        int: points,
      },
    },
    ...(appUrl && !appUrl.includes('localhost')
      ? {
          heroImage: {
            sourceUri: { uri: `${appUrl}/api/images/card/${points}?v=${IMAGE_VERSION}&rev=${merchant?.push_settings?.hero_image?.length || 0}&merchant=${merchant.slug}` },
          },
        }
      : {}),
    textModulesData: [
      {
        id: 'address',
        header: t.address,
        body: merchant.address || t.addressUnknown || 'Adresse unbekannt',
      },
      {
        id: 'status',
        header: t.status,
        body: t.statusWelcome ? t.statusWelcome.replace('{name}', merchant.name) : `Willkommen bei ${merchant.name}! 👋`,
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
 * Invalidates (expires) a LoyaltyObject in Google Wallet (e.g. when a customer is deleted)
 */
export async function invalidateLoyaltyObject(objectId: string) {
  try {
    const issuerId = process.env.GOOGLE_ISSUER_ID;
    
    // We patch the state to EXPIRED which removes it from the active passes
    const response = await walletClient.loyaltyobject.patch({
      resourceId: `${issuerId}.${objectId}`,
      requestBody: {
        state: 'EXPIRED',
        textModulesData: [
          {
            id: 'status',
            header: 'Status',
            body: 'Kundenkarte wurde gelöscht oder deaktiviert.',
          },
        ]
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('API Error invalidating object:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Updates an existing LoyaltyObject (e.g. after adding a stamp)
 */
export async function updateLoyaltyObjectPoints(objectId: string, points: number, isRedeem: boolean = false, merchant: any) {
  const lang = merchant?.language || 'de';
  const t = DICT[lang as keyof typeof DICT] || DICT.de;
  try {
    const issuerId = process.env.GOOGLE_ISSUER_ID;
    const isPublicUrl = appUrl && !appUrl.includes('localhost');
    
    const stampGoal = merchant?.stamp_goal || 9;

    const heroImageUri = points >= stampGoal
      ? `${appUrl}/api/images/redeem?v=${IMAGE_VERSION}&rev=${merchant?.push_settings?.hero_image?.length || 0}&merchant=${merchant?.slug}`
      : `${appUrl}/api/images/card/${points}?v=${IMAGE_VERSION}&rev=${merchant?.push_settings?.hero_image?.length || 0}&merchant=${merchant?.slug}`;

    const updatedObject: any = {
      loyaltyPoints: {
        balance: { int: points },
        label: t.stamp,
      },
      ...(isPublicUrl
        ? { heroImage: { sourceUri: { uri: heroImageUri } } }
        : {}),
      textModulesData: [
        {
          id: 'address',
          header: t.address,
          body: merchant?.address || t.addressUnknown || 'Adresse unbekannt',
        },
        {
          id: 'status',
          header: t.status,
          body: isRedeem
            ? t.statusRedeemed
            : points >= stampGoal
            ? t.statusReady
            : points >= stampGoal - 1
            ? t.statusAlmost
            : points >= Math.floor(stampGoal / 2)
            ? t.statusHalfway
            : t.statusWelcome.replace('{name}', merchant?.name || 'uns'),
        },
      ]
    };

    // Always add a notify message to force Google Wallet to refresh the pass on the device
    const push = merchant?.push_settings || {};
    
    if (isRedeem) {
      updatedObject.messages = [
        {
          header: push.redeem_header || t.redeemHeader,
          body: push.redeem_body || t.redeemBody,
          id: `REDEEM_MESSAGE_${Date.now()}`,
          messageType: 'TEXT_AND_NOTIFY'
        }
      ];
    } else if (points >= stampGoal) {
      updatedObject.linksModuleData = {
        uris: [
          {
            uri: 'https://search.google.com/local/writereview?placeid=PLACEHOLDER',
            description: t.reviewText,
          }
        ]
      };
      updatedObject.messages = [
        {
          header: push.reward_header || t.rewardHeader,
          body: push.reward_body || merchant?.reward_text || t.rewardBody,
          id: `REWARD_READY_MESSAGE_${Date.now()}`,
          messageType: 'TEXT_AND_NOTIFY'
        }
      ];
    } else {
      // For regular stamps: send a silent notify to force the pass to refresh
      const headerTpl = t.defaultStampHeader1.replace('9', stampGoal.toString());
      const defaultStampHeader = `${points}${headerTpl}${merchant?.stamp_symbol || '✨'}`;
      const defaultStampBody = points >= stampGoal - 1
            ? t.defaultStampBodyNear
            : `${t.defaultStampBody}${points}${t.defaultStampBody2}`;
            
      const customHeader = push.stamp_header ? push.stamp_header.replace(/{points}/g, points.toString()) : defaultStampHeader;
      const customBody = push.stamp_body ? push.stamp_body.replace(/{points}/g, points.toString()) : defaultStampBody;

      updatedObject.messages = [
        {
          header: customHeader,
          body: customBody,
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
