import Config from 'react-native-config';

export interface SendOtpParams {
  toEmail: string;
  toName: string;
  otpCode: string;
  role?: 'passenger' | 'driver';
}

export interface EmailServiceResult {
  success: boolean;
  message?: string;
  isMock?: boolean;
}

const EMAILJS_API_URL = 'https://api.emailjs.com/api/v1.0/email/send';

/**
 * Sends a 6-digit OTP verification email using the EmailJS service.
 */
export async function sendOtpEmail(params: SendOtpParams): Promise<EmailServiceResult> {
  const rawServiceId = Config.EMAILJS_SERVICE_ID || process.env.EMAILJS_SERVICE_ID;
  // If native react-native-config cache still has the stale template ID, recover automatically
  const serviceId = (rawServiceId && !rawServiceId.startsWith('template_'))
    ? rawServiceId
    : 'service_k60qbms';

  const templateId = Config.EMAILJS_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID || 'template_ebugcpd';
  const publicKey = Config.EMAILJS_PUBLIC_KEY || process.env.EMAILJS_PUBLIC_KEY || '5tV1k3l8H09I6n1KX';
  const privateKey = Config.EMAILJS_PRIVATE_KEY || process.env.EMAILJS_PRIVATE_KEY;

  const { toEmail, toName, otpCode, role = 'passenger' } = params;

  // Development fallback when EmailJS keys are not yet configured in .env
  if (!serviceId || !templateId || !publicKey) {
    if (__DEV__) {
      return {
        success: true,
        isMock: true,
        message: `[DEV MODE] EmailJS keys missing in .env. OTP code is: ${otpCode}`,
      };
    }
    return {
      success: false,
      message: 'EmailJS is not configured. Please add EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, and EMAILJS_PUBLIC_KEY in .env.',
    };
  }

  try {
    const payload: Record<string, unknown> = {
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: {
        to_name: toName || 'User',
        to_email: toEmail,
        otp_code: otpCode,
        role: role.toUpperCase(),
        app_name: 'PARA Tricycle Booking',
        expiry_minutes: 10,
      },
    };

    if (privateKey) {
      payload.accessToken = privateKey;
    }

    const response = await fetch(EMAILJS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let hint = '';

      if (response.status === 403 && errorText.includes('strict mode')) {
        hint = ' (Fix: Go to EmailJS Dashboard > Account > Security and disable "Strict Mode", or add your Private Key as EMAILJS_PRIVATE_KEY in .env)';
      } else if (response.status === 502) {
        hint = ' (Fix: Go to EmailJS Dashboard > Email Services. Verify that your email service like Gmail/Outlook is active and connected)';
      }

      return {
        success: false,
        message: `EmailJS error (${response.status}): ${errorText || response.statusText}${hint}`,
      };
    }

    return {
      success: true,
      message: `Verification email sent successfully to ${toEmail}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Network error while sending email',
    };
  }
}
