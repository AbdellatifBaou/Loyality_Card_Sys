import React from 'react';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import forge from 'node-forge';
import { PKPass } from 'passkit-generator';
import sharp from 'sharp';
import { ImageResponse } from 'next/og';

interface MerchantData {
  id: string;
  name: string;
  slug: string;
  primary_color?: string;
  stamp_symbol?: string;
  stamp_goal?: number;
  reward_text?: string;
  address?: string;
  contact_phone?: string;
  contact_email?: string;
  language?: string;
  logo_url?: string;
  push_settings?: any;
  latest_message?: { header: string; body: string; created_at?: string };
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

export function hexToRgbRaw(hex: string): string {
  if (!hex) return '212, 175, 55';
  let cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return '212, 175, 55';
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r}, ${g}, ${b}`;
}

const DICT: Record<string, any> = {
  de: {
    stampsLabel: "STEMPEL",
    rewardLabel: "BELOHNUNG",
    customerIdLabel: "KUNDEN-ID",
    termsLabel: "TEILNAHMEBEDINGUNGEN",
    addressLabel: "ADRESSE",
    contactLabel: "KONTAKT",
    supportLabel: "DIGITALE STEMPELKARTE",
    termsText: "Zeige diese digitale Treuekarte bei jedem Besuch an der Kasse vor. Pro Einkauf/Bestellung erhältst du Stempel. Bei voller Karte wird deine Belohnung eingelöst!",
    supportText: "Bereitgestellt von Marketif (marketif.net) – Digitale Kundenkarten & Kundenbindung.",
    changeStamps: "Stempelstand aktualisiert: %@",
    changeReward: "Belohnung: %@",
    congrats: "Herzlichen Glückwunsch!",
    hint: "Zeige diese Karte beim nächsten Besuch vor"
  },
  fr: {
    stampsLabel: "TAMPONS",
    rewardLabel: "RÉCOMPENSE",
    customerIdLabel: "ID CLIENT",
    termsLabel: "CONDITIONS DU PROGRAMME",
    addressLabel: "ADRESSE",
    contactLabel: "CONTACT",
    supportLabel: "CARTE DE FIDÉLITÉ DIGITALE",
    termsText: "Présentez cette carte digitale à chaque passage en caisse. Cumulez des tampons et débloquez votre récompense exclusive!",
    supportText: "Propulsé par Marketif (marketif.net) – Cartes de fidélité digitales & rétention client.",
    changeStamps: "Tampons mis à jour : %@",
    changeReward: "Récompense : %@",
    congrats: "Félicitations !",
    hint: "Présentez cette carte lors de votre prochaine visite"
  }
};

export function buildPassJson(merchant: MerchantData, customer: CustomerData) {
  const lang = merchant.language === 'fr' ? 'fr' : 'de';
  const t = DICT[lang] || DICT.de;
  const stampGoal = merchant.stamp_goal || 9;
  const currentPoints = customer.points || 0;
  const rewardText = merchant.reward_text || (lang === 'fr' ? '1 Récompense Gratuite' : '1 Gratis Belohnung');

  const passTypeId = process.env.APPLE_PASS_TYPE_IDENTIFIER || 'pass.de.marketif.loyalty';
  const teamId = process.env.APPLE_TEAM_ID || 'HA5ATW8338';
  const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://treue.marketif.de';
  const cleanAppUrl = rawAppUrl.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '').replace(/\/$/, '');
  const isHttps = cleanAppUrl && cleanAppUrl.startsWith('https://');

  const shortId = (customer.wallet_object_id || customer.id).split('-')[0] || (customer.wallet_object_id || customer.id).slice(0, 8);

  return {
    formatVersion: 1,
    passTypeIdentifier: passTypeId,
    serialNumber: customer.wallet_object_id || customer.id,
    teamIdentifier: teamId,
    ...(isHttps ? {
      webServiceURL: `${cleanAppUrl}/api`,
      authenticationToken: customer.auth_token || crypto.createHash('sha256').update(customer.wallet_object_id || customer.id).digest('hex'),
    } : {}),
    organizationName: merchant.name || 'Marketif Loyalty',
    description: `${merchant.name} ${lang === 'fr' ? 'Carte de Fidélité' : 'Treuekarte'}`,
    logoText: merchant.name,
    foregroundColor: 'rgb(255, 255, 255)',
    backgroundColor: 'rgb(16, 14, 12)',
    labelColor: hexToRgb(merchant.primary_color || '#D4AF37'),
    barcodes: [
      {
        format: 'PKBarcodeFormatQR',
        message: customer.wallet_object_id || customer.id,
        messageEncoding: 'iso-8859-1',
        altText: shortId,
      }
    ],
    storeCard: {
      headerFields: [
        {
          key: 'points_header',
          label: t.stampsLabel,
          value: `${currentPoints} / ${stampGoal}`,
          textAlignment: 'PKTextAlignmentRight',
          changeMessage: t.changeStamps
        }
      ],
      // No primaryFields: leaves the main front card body fully open for strip.png banner
      primaryFields: [],
      secondaryFields: [
        {
          key: 'reward',
          label: t.rewardLabel,
          value: rewardText,
          changeMessage: t.changeReward
        }
      ],
      auxiliaryFields: [
        {
          key: 'customer_id',
          label: t.customerIdLabel,
          value: shortId
        }
      ],
      backFields: [
        ...(merchant.latest_message ? [{
          key: 'latest_message',
          label: lang === 'fr' ? 'MESSAGE / OFFRE' : 'AKTUELLE NACHRICHT',
          value: `${merchant.latest_message.header}\n\n${merchant.latest_message.body}`,
          changeMessage: '%@'
        }] : []),
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

function cleanEnv(val?: string): string {
  if (!val) return '';
  let cleaned = val.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

function parsePem(pemStr?: string): string {
  if (!pemStr) return '';
  let cleaned = cleanEnv(pemStr);
  if (cleaned.includes('\\n')) {
    cleaned = cleaned.replace(/\\n/g, '\n');
  }
  return cleaned;
}

let cachedSigner: { signerCert: string; signerKey: string; wwdr: string } | null = null;

function getSignerCredentials() {
  if (cachedSigner) return cachedSigner;

  const directCertPem = parsePem(process.env.APPLE_PASS_SIGNER_CERT_PEM);
  const directKeyPem = parsePem(process.env.APPLE_PASS_SIGNER_KEY_PEM);
  const wwdrPem = parsePem(process.env.APPLE_WWDR_CERT_PEM);

  // 1. If direct PEM credentials are provided, use them directly
  if (directCertPem && directKeyPem) {
    cachedSigner = {
      signerCert: directCertPem,
      signerKey: directKeyPem,
      wwdr: wwdrPem
    };
    return cachedSigner;
  }

  // 2. Fallback to P12 Base64
  const p12Base64 = cleanEnv(process.env.APPLE_PASS_CERT_P12_BASE64);
  const p12Password = cleanEnv(process.env.APPLE_PASS_CERT_PASSWORD);

  if (!p12Base64) {
    throw new Error('Apple Wallet credentials missing. Please set APPLE_PASS_SIGNER_CERT_PEM and APPLE_PASS_SIGNER_KEY_PEM.');
  }

  const sanitizedBase64 = p12Base64.replace(/\s+/g, '');
  const p12Der = Buffer.from(sanitizedBase64, 'base64').toString('binary');
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, p12Password);

  let signerCertPem: string | null = null;
  let signerKeyPem: string | null = null;

  for (const safeContent of p12.safeContents) {
    for (const safeBag of safeContent.safeBags) {
      if (safeBag.type === forge.pki.oids.certBag) {
        const c = safeBag.cert;
        const cnAttr = c?.subject?.attributes?.find((a: any) => a.name === 'commonName' || a.shortName === 'CN');
        if (cnAttr && (cnAttr.value.includes('pass.') || cnAttr.value.includes('Pass Type ID'))) {
          signerCertPem = forge.pki.certificateToPem(c);
        } else if (!signerCertPem) {
          signerCertPem = forge.pki.certificateToPem(c);
        }
      } else if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag || safeBag.type === forge.pki.oids.keyBag) {
        signerKeyPem = forge.pki.privateKeyToPem(safeBag.key);
      }
    }
  }

  if (!signerCertPem || !signerKeyPem) {
    throw new Error('Failed to extract Apple Wallet signer certificate or private key from P12 bundle');
  }

  cachedSigner = {
    signerCert: signerCertPem,
    signerKey: signerKeyPem,
    wwdr: wwdrPem
  };

  return cachedSigner;
}

async function loadBuffer(source?: string): Promise<Buffer | null> {
  if (!source) return null;
  try {
    if (source.startsWith('http://') || source.startsWith('https://')) {
      const res = await fetch(source, { cache: 'no-store' });
      if (res.ok) {
        const arr = await res.arrayBuffer();
        return Buffer.from(arr);
      }
    } else if (source.startsWith('data:image/')) {
      const base64Data = source.split(',')[1];
      if (base64Data) return Buffer.from(base64Data, 'base64');
    } else if (fs.existsSync(source)) {
      return fs.readFileSync(source);
    }
  } catch (e) {
    console.warn('[Apple Wallet] Could not load image buffer:', source, e);
  }
  return null;
}

/**
 * Generates the Apple Wallet Strip Banner (1125 x 369)
 * 1:1 identical to Google Wallet card design with custom Emojis, cover photo, glowing circles
 */
async function generateStripBuffer(
  points: number,
  stampGoal: number,
  stampSymbol: string,
  primaryColor?: string,
  language?: string,
  rewardText?: string,
  heroImageUrl?: string | null,
  merchantName?: string
): Promise<Buffer> {
  const gold = primaryColor || '#D4AF37';
  const rgb = hexToRgbRaw(gold);
  const lang = language === 'fr' ? 'fr' : 'de';
  const t = DICT[lang] || DICT.de;
  const isFull = points >= stampGoal;
  const displayReward = rewardText || (lang === 'fr' ? '1 Récompense Gratuite' : '1 Gratis Belohnung');

  let element: React.ReactElement;

  if (isFull) {
    // 1. REWARD READY STATE - 1:1 matching Google Wallet Redeem screen
    element = (
      <div
        style={{
          width: '1125px',
          height: '369px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: heroImageUrl ? '#000000' : 'linear-gradient(160deg, #0E0B03 0%, #080808 55%, #0B0900 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
          gap: '10px',
          padding: '20px 40px',
        }}
      >
        {heroImageUrl && (
          <img
            src={heroImageUrl}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '1125px',
              height: '369px',
              objectFit: 'cover',
              opacity: 0.55,
            }}
          />
        )}
        {/* Ambient gold glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '900px',
            height: '300px',
            borderRadius: '50%',
            background: `radial-gradient(ellipse, rgba(${rgb}, 0.25) 0%, transparent 65%)`,
            transform: 'translate(-50%, -50%)',
          }}
        />
        {/* Gold top border */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: `linear-gradient(90deg, transparent, ${gold} 20%, #FFF5B8 50%, ${gold} 80%, transparent)`,
          }}
        />
        {/* Gold bottom border */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: `linear-gradient(90deg, transparent, rgba(${rgb}, 0.5) 50%, transparent)`,
          }}
        />

        {/* Merchant name */}
        <span
          style={{
            fontSize: '18px',
            letterSpacing: '5px',
            textTransform: 'uppercase',
            color: '#FFFFFF',
            fontWeight: 'bold',
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          }}
        >
          {merchantName || 'TREUEPROGRAMM'}
        </span>

        {/* Main congrats */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
          }}
        >
          <span
            style={{
              fontSize: '44px',
              fontWeight: 'bold',
              color: '#FFFFFF',
              textShadow: '0 2px 12px rgba(0,0,0,0.8)',
            }}
          >
            {t.congrats}
          </span>
          <span style={{ fontSize: '44px' }}>🎉</span>
        </div>

        {/* Subtitle / Reward */}
        <span
          style={{
            fontSize: '28px',
            color: '#FFFFFF',
            fontWeight: 'bold',
            textAlign: 'center',
            textShadow: '0 2px 10px rgba(0,0,0,0.8)',
          }}
        >
          {displayReward}
        </span>

        {/* Bottom hint */}
        <span
          style={{
            fontSize: '16px',
            color: '#E0E0E0',
            letterSpacing: '1px',
            textAlign: 'center',
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          }}
        >
          {t.hint}
        </span>
      </div>
    );
  } else {
    // 2. STAMP COLLECTING STATE - 1:1 matching Google Wallet Card design with harmonized sizes
    const colsPerRow = stampGoal <= 5 ? stampGoal : (stampGoal <= 10 ? Math.ceil(stampGoal / 2) : 6);
    const numRows = Math.ceil(stampGoal / colsPerRow);

    let size = 105;
    let gap = 18;
    let emojiSize = '46px';

    if (stampGoal <= 4) {
      size = 140;
      gap = 28;
      emojiSize = '62px';
    } else if (stampGoal === 5) {
      size = 130;
      gap = 22;
      emojiSize = '56px';
    } else if (stampGoal <= 10) {
      size = 105;
      gap = 18;
      emojiSize = '46px';
    } else {
      size = 85;
      gap = 14;
      emojiSize = '36px';
    }

    const rowsArray: number[][] = [];
    for (let r = 0; r < numRows; r++) {
      const rowItems: number[] = [];
      const count = (r === numRows - 1) ? (stampGoal - r * colsPerRow) : colsPerRow;
      for (let c = 0; c < count; c++) {
        rowItems.push(r * colsPerRow + c);
      }
      rowsArray.push(rowItems);
    }

    element = (
      <div
        style={{
          width: '1125px',
          height: '369px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: heroImageUrl ? '#000000' : 'linear-gradient(160deg, #0E0B03 0%, #080808 55%, #0B0900 100%)',
          position: 'relative',
          overflow: 'hidden',
          gap: `${gap}px`,
          padding: '20px',
        }}
      >
        {heroImageUrl && (
          <img
            src={heroImageUrl}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '1125px',
              height: '369px',
              objectFit: 'cover',
              opacity: 0.65,
            }}
          />
        )}
        {/* Ambient glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '900px',
            height: '300px',
            borderRadius: '50%',
            background: `radial-gradient(ellipse, rgba(${rgb}, 0.18) 0%, transparent 65%)`,
            transform: 'translate(-50%, -50%)',
          }}
        />
        {/* Gold top border */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: `linear-gradient(90deg, transparent, ${gold} 20%, #FFF5B8 50%, ${gold} 80%, transparent)`,
          }}
        />
        {/* Gold bottom border */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: `linear-gradient(90deg, transparent, rgba(${rgb}, 0.5) 50%, transparent)`,
          }}
        />

        {rowsArray.map((row, rIdx) => (
          <div key={rIdx} style={{ display: 'flex', gap: `${gap}px`, alignItems: 'center', justifyContent: 'center' }}>
            {row.map((itemIdx) => {
              const stamped = itemIdx < points;
              return (
                <div
                  key={itemIdx}
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    background: stamped
                      ? `radial-gradient(circle at 35% 28%, ${gold}, #8A5D00, #3E2A00)`
                      : `rgba(${rgb}, 0.08)`,
                    border: stamped
                      ? `4px solid ${gold}`
                      : `3px solid rgba(${rgb}, 0.45)`,
                    boxShadow: stamped
                      ? `0 0 32px rgba(${rgb}, 0.9), 0 0 10px rgba(${rgb}, 0.6), inset 0 3px 0 rgba(255,255,255,0.3)`
                      : `inset 0 3px 8px rgba(0,0,0,0.5)`,
                  }}
                >
                  {stamped ? (
                    <span style={{ fontSize: emojiSize, lineHeight: 1 }}>{stampSymbol}</span>
                  ) : (
                    <span style={{ fontSize: emojiSize, lineHeight: 1, opacity: 0.2 }}>
                      {stampSymbol}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  const imageRes = new ImageResponse(element, { width: 1125, height: 369 });
  const arrayBuffer = await imageRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Creates the in-memory .pkpass ZIP archive with passkit-generator
 */
export async function generatePkPass(merchant: MerchantData, customer: CustomerData): Promise<Buffer> {
  const credentials = getSignerCredentials();

  // If latest_message is not set, attempt to fetch it from database
  if (!merchant.latest_message && merchant.id) {
    try {
      const { getAdminSupabase } = require('./supabase');
      const adminSupabase = getAdminSupabase();
      const { data: latestMsg } = await adminSupabase
        .from('messages_loyality')
        .select('header, body, created_at')
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (latestMsg) {
        merchant.latest_message = latestMsg;
      }
    } catch {
      // Ignore
    }
  }

  const passJson = buildPassJson(merchant, customer);
  const passJsonBuffer = Buffer.from(JSON.stringify(passJson, null, 2), 'utf8');

  // Prepare images with Sharp
  const publicDir = path.join(process.cwd(), 'public');
  const iconPath = path.join(publicDir, 'icon-192x192.png');
  const defaultLogoPath = path.join(publicDir, 'Marketif_LOGO_Symbol.png');

  const defaultIcon = fs.existsSync(iconPath) ? fs.readFileSync(iconPath) : null;
  const defaultLogo = fs.existsSync(defaultLogoPath) ? fs.readFileSync(defaultLogoPath) : null;

  // 1. Try to load merchant custom logo
  const merchantLogoBuffer = await loadBuffer(merchant.logo_url);
  const logoSource = merchantLogoBuffer || defaultLogo;
  const iconSource = merchantLogoBuffer || defaultIcon || logoSource;

  const buffersMap: Record<string, Buffer> = {
    'pass.json': passJsonBuffer
  };

  if (iconSource) {
    const [icon1x, icon2x, icon3x] = await Promise.all([
      sharp(iconSource).resize(29, 29).png().toBuffer(),
      sharp(iconSource).resize(58, 58).png().toBuffer(),
      sharp(iconSource).resize(87, 87).png().toBuffer()
    ]);
    buffersMap['icon.png'] = icon1x;
    buffersMap['icon@2x.png'] = icon2x;
    buffersMap['icon@3x.png'] = icon3x;
  }

  if (logoSource) {
    const [logo1x, logo2x, logo3x] = await Promise.all([
      sharp(logoSource).resize({ width: 160, height: 50, fit: 'inside' }).png().toBuffer(),
      sharp(logoSource).resize({ width: 320, height: 100, fit: 'inside' }).png().toBuffer(),
      sharp(logoSource).resize({ width: 480, height: 150, fit: 'inside' }).png().toBuffer()
    ]);
    buffersMap['logo.png'] = logo1x;
    buffersMap['logo@2x.png'] = logo2x;
    buffersMap['logo@3x.png'] = logo3x;
  }

  // Generate dynamic strip banner with stamp circles & emojis using Next.js ImageResponse (matching Google Wallet 1:1)
  const stampGoal = merchant.stamp_goal || 9;
  const currentPoints = customer.points || 0;
  const stampSymbol = merchant.stamp_symbol || '✨';
  const rewardText = merchant.reward_text || (merchant.language === 'fr' ? '1 Récompense Gratuite' : '1 Gratis Belohnung');
  const heroImageUrl = merchant.push_settings?.hero_image || null;

  const strip3x = await generateStripBuffer(
    currentPoints,
    stampGoal,
    stampSymbol,
    merchant.primary_color,
    merchant.language,
    rewardText,
    heroImageUrl,
    merchant.name
  );

  const [strip1x, strip2x] = await Promise.all([
    sharp(strip3x).resize(375, 123).png().toBuffer(),
    sharp(strip3x).resize(750, 246).png().toBuffer(),
  ]);

  buffersMap['strip.png'] = strip1x;
  buffersMap['strip@2x.png'] = strip2x;
  buffersMap['strip@3x.png'] = strip3x;

  const pass = new PKPass(buffersMap, credentials);
  return pass.getAsBuffer();
}
