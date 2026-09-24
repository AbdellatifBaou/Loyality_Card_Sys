import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import forge from 'node-forge';
import { ZipArchive } from 'archiver';
import sharp from 'sharp';

interface MerchantData {
  id: string;
  name: string;
  slug: string;
  primary_color?: string;
  stamp_goal?: number;
  reward_text?: string;
  address?: string;
  contact_phone?: string;
  contact_email?: string;
  language?: string;
  logo_url?: string;
  push_settings?: any;
}

interface CustomerData {
  id: string;
  wallet_object_id: string;
  points: number;
  created_at?: string;
  auth_token?: string;
}

// Convert Hex color (#D4AF37) to Apple PassKit RGB string "rgb(212, 175, 55)"
export function hexToRgb(hex: string): string {
  if (!hex) return 'rgb(212, 175, 55)';
  let cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return 'rgb(212, 175, 55)';
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgb(${r}, ${g}, ${b})`;
}

const DICT: Record<string, any> = {
  de: {
    stampsLabel: "STEMPEL",
    statusLabel: "STATUS",
    rewardLabel: "BELOHNUNG",
    customerIdLabel: "KUNDEN-ID",
    termsLabel: "TEILNAHMEBEDINGUNGEN",
    addressLabel: "ADRESSE",
    contactLabel: "KONTAKT",
    supportLabel: "DIGITALE STEMPELKARTE",
    termsText: "Zeige diese digitale Treuekarte bei jedem Besuch an der Kasse vor. Pro Einkauf/Bestellung erhältst du Stempel. Bei voller Karte wird deine Belohnung eingelöst!",
    supportText: "Bereitgestellt von Marketif (marketif.net) – Digitale Kundenkarten & Kundenbindung.",
    almostDone: "Fast geschafft! Noch 1 Stempel 🎉",
    rewardReady: "BELOHNUNG BEREIT! 🎉",
    collecting: "Fleißig sammeln 🚀",
  },
  fr: {
    stampsLabel: "TAMPONS",
    statusLabel: "STATUT",
    rewardLabel: "RÉCOMPENSE",
    customerIdLabel: "ID CLIENT",
    termsLabel: "CONDITIONS DU PROGRAMME",
    addressLabel: "ADRESSE",
    contactLabel: "CONTACT",
    supportLabel: "CARTE DE FIDÉLITÉ DIGITALE",
    termsText: "Présentez cette carte digitale à chaque passage en caisse. Cumulez des tampons et débloquez votre récompense exclusive!",
    supportText: "Propulsé par Marketif (marketif.net) – Cartes de fidélité digitales & rétention client.",
    almostDone: "Presque prêt! Plus qu'1 tampon 🎉",
    rewardReady: "RÉCOMPENSE PRÊTE! 🎉",
    collecting: "En cours de collecte 🚀",
  }
};

export function buildPassJson(merchant: MerchantData, customer: CustomerData) {
  const lang = merchant.language === 'fr' ? 'fr' : 'de';
  const t = DICT[lang] || DICT.de;
  const stampGoal = merchant.stamp_goal || 9;
  const currentPoints = customer.points || 0;
  const rewardText = merchant.reward_text || (lang === 'fr' ? '1 Récompense Gratuite' : '1 Gratis Belohnung');

  let statusText = t.collecting;
  if (currentPoints >= stampGoal) {
    statusText = t.rewardReady;
  } else if (currentPoints === stampGoal - 1) {
    statusText = t.almostDone;
  }

  const passTypeId = process.env.APPLE_PASS_TYPE_IDENTIFIER || 'pass.de.marketif.loyalty';
  const teamId = process.env.APPLE_TEAM_ID || 'HA5ATW8338';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://treue.marketif.de';

  const isHttps = appUrl && appUrl.startsWith('https://');

  return {
    formatVersion: 1,
    passTypeIdentifier: passTypeId,
    serialNumber: customer.wallet_object_id || customer.id,
    teamIdentifier: teamId,
    ...(isHttps ? {
      webServiceURL: `${appUrl}/api/v1`,
      authenticationToken: customer.auth_token || crypto.createHash('sha256').update(customer.wallet_object_id || customer.id).digest('hex'),
    } : {}),
    organizationName: merchant.name || 'Marketif Loyalty',
    description: `${merchant.name} ${lang === 'fr' ? 'Carte de Fidélité' : 'Treuekarte'}`,
    logoText: merchant.name,
    foregroundColor: 'rgb(255, 255, 255)',
    backgroundColor: hexToRgb(merchant.primary_color || '#D4AF37'),
    labelColor: 'rgb(240, 240, 240)',
    barcodes: [
      {
        format: 'PKBarcodeFormatQR',
        message: customer.wallet_object_id || customer.id,
        messageEncoding: 'iso-8859-1',
        altText: customer.wallet_object_id || customer.id,
      }
    ],
    storeCard: {
      headerFields: [
        {
          key: 'points_header',
          label: t.stampsLabel,
          value: `${currentPoints} / ${stampGoal}`,
          textAlignment: 'PKTextAlignmentRight'
        }
      ],
      primaryFields: [
        {
          key: 'status',
          label: t.statusLabel,
          value: statusText
        }
      ],
      secondaryFields: [
        {
          key: 'reward',
          label: t.rewardLabel,
          value: rewardText
        }
      ],
      auxiliaryFields: [
        {
          key: 'customer_id',
          label: t.customerIdLabel,
          value: customer.wallet_object_id || customer.id
        }
      ],
      backFields: [
        {
          key: 'reward_detail',
          label: t.rewardLabel,
          value: rewardText
        },
        {
          key: 'terms',
          label: t.termsLabel,
          value: t.termsText
        },
        ...(merchant.address ? [{
          key: 'address',
          label: t.addressLabel,
          value: merchant.address
        }] : []),
        ...(merchant.contact_phone ? [{
          key: 'phone',
          label: t.contactLabel,
          value: merchant.contact_phone
        }] : []),
        {
          key: 'support',
          label: t.supportLabel,
          value: t.supportText
        }
      ]
    }
  };
}

/**
 * Generate PKCS#7 detached signature for manifest.json
 */
export function signManifest(manifestBuffer: Buffer): Buffer | null {
  const p12Base64 = process.env.APPLE_PASS_CERT_P12_BASE64;
  const p12Password = process.env.APPLE_PASS_CERT_PASSWORD || '';
  const wwdrPem = process.env.APPLE_WWDR_CERT_PEM;

  if (!p12Base64) {
    console.warn('Apple Pass signing skipped: APPLE_PASS_CERT_P12_BASE64 is not set in environment.');
    return null;
  }

  try {
    const p12Der = forge.util.decode64(p12Base64);
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, p12Password);

    let cert: any = null;
    let key: any = null;

    for (const safeContent of p12.safeContents) {
      for (const safeBag of safeContent.safeBags) {
        if (safeBag.type === forge.pki.oids.certBag) {
          const c = safeBag.cert;
          const cnAttr = c?.subject?.attributes?.find((a: any) => a.name === 'commonName' || a.shortName === 'CN');
          if (cnAttr && (cnAttr.value.includes('pass.') || cnAttr.value.includes('Pass Type ID'))) {
            cert = c;
          } else if (!cert) {
            cert = c;
          }
        } else if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag || safeBag.type === forge.pki.oids.keyBag) {
          key = safeBag.key;
        }
      }
    }

    if (!cert || !key) {
      throw new Error('Could not find certificate or private key in P12 bundle');
    }

    // Create PKCS#7 signed data
    const p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(manifestBuffer.toString('utf8'), 'utf8');
    p7.addCertificate(cert);

    if (wwdrPem) {
      const cleanPem = wwdrPem.includes('\\n') ? wwdrPem.replace(/\\n/g, '\n') : wwdrPem;
      const wwdrCert = forge.pki.certificateFromPem(cleanPem);
      p7.addCertificate(wwdrCert);
    }

    p7.addSigner({
      key: key,
      certificate: cert,
      digestAlgorithm: forge.pki.oids.sha1,
      authenticatedAttributes: [
        {
          type: forge.pki.oids.contentType,
          value: forge.pki.oids.data
        },
        {
          type: forge.pki.oids.messageDigest
        },
        {
          type: forge.pki.oids.signingTime,
          value: new Date()
        }
      ]
    });

    p7.sign({ detached: true });
    const p7Der = forge.asn1.toDer(p7.toAsn1()).getBytes();
    return Buffer.from(p7Der, 'binary');
  } catch (error) {
    console.error('Error signing Apple Pass manifest:', error);
    return null;
  }
}

/**
 * Creates the in-memory .pkpass ZIP archive with properly scaled Apple PassKit assets
 */
export async function generatePkPass(merchant: MerchantData, customer: CustomerData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const passJson = buildPassJson(merchant, customer);
      const passJsonBuffer = Buffer.from(JSON.stringify(passJson, null, 2), 'utf8');

      const files: { filename: string; buffer: Buffer }[] = [
        { filename: 'pass.json', buffer: passJsonBuffer }
      ];

      // Prepare icons & logo images
      const publicDir = path.join(process.cwd(), 'public');
      const iconPath = path.join(publicDir, 'icon-192x192.png');
      const defaultLogoPath = path.join(publicDir, 'Marketif_LOGO_Symbol.png');

      const iconSource = fs.existsSync(iconPath) ? fs.readFileSync(iconPath) : null;
      const logoSource = fs.existsSync(defaultLogoPath) ? fs.readFileSync(defaultLogoPath) : null;

      if (iconSource) {
        const [icon1x, icon2x, icon3x] = await Promise.all([
          sharp(iconSource).resize(29, 29).png().toBuffer(),
          sharp(iconSource).resize(58, 58).png().toBuffer(),
          sharp(iconSource).resize(87, 87).png().toBuffer()
        ]);
        files.push({ filename: 'icon.png', buffer: icon1x });
        files.push({ filename: 'icon@2x.png', buffer: icon2x });
        files.push({ filename: 'icon@3x.png', buffer: icon3x });
      }

      if (logoSource) {
        const [logo1x, logo2x, logo3x] = await Promise.all([
          sharp(logoSource).resize({ width: 160, height: 50, fit: 'inside' }).png().toBuffer(),
          sharp(logoSource).resize({ width: 320, height: 100, fit: 'inside' }).png().toBuffer(),
          sharp(logoSource).resize({ width: 480, height: 150, fit: 'inside' }).png().toBuffer()
        ]);
        files.push({ filename: 'logo.png', buffer: logo1x });
        files.push({ filename: 'logo@2x.png', buffer: logo2x });
        files.push({ filename: 'logo@3x.png', buffer: logo3x });
      }

      // 1. Build manifest.json with SHA1 hash for each file
      const manifest: Record<string, string> = {};
      for (const file of files) {
        manifest[file.filename] = crypto.createHash('sha1').update(file.buffer).digest('hex');
      }

      const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2), 'utf8');
      files.push({ filename: 'manifest.json', buffer: manifestBuffer });

      // 2. Sign manifest.json
      const signatureBuffer = signManifest(manifestBuffer);
      if (signatureBuffer) {
        files.push({ filename: 'signature', buffer: signatureBuffer });
      }

      // 3. Zip into .pkpass archive
      const archive = new ZipArchive({ zlib: { level: 9 } });
      const buffers: Buffer[] = [];

      archive.on('data', data => buffers.push(data));
      archive.on('end', () => resolve(Buffer.concat(buffers)));
      archive.on('error', err => reject(err));

      for (const file of files) {
        archive.append(file.buffer, { name: file.filename });
      }

      archive.finalize();
    } catch (err) {
      reject(err);
    }
  });
}
