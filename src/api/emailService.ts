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
}

const EMAILJS_API_URL = 'https://api.emailjs.com/api/v1.0/email/send';

/**
 * Sends a 6-digit OTP verification email using the EmailJS service.
 */
export async function sendOtpEmail(params: SendOtpParams): Promise<EmailServiceResult> {
  const rawServiceId = Config.EMAILJS_SERVICE_ID;
  // If a previous build injected the wrong variable, fall back to the service
  // id prefix check rather than a hard-coded credential.
  const serviceId = (rawServiceId && !rawServiceId.startsWith('template_'))
    ? rawServiceId
    : '';

  const templateId = Config.EMAILJS_TEMPLATE_ID || '';
  const publicKey = Config.EMAILJS_PUBLIC_KEY || '';
  const privateKey = Config.EMAILJS_PRIVATE_KEY || '';

  const { toEmail, toName, otpCode, role = 'passenger' } = params;

  if (!serviceId || !templateId || !publicKey) {
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
