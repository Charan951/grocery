// Pluggable SMS sender.
//
// When no provider is configured (SMS_PROVIDER unset) or OTP_TEST_MODE=true, the
// service runs in test mode: it logs the message instead of sending an SMS, and
// the OTP controller uses a fixed code so local/CI flows work without a real
// gateway. Set SMS_PROVIDER=msg91|twilio plus the matching credentials to send
// real messages (adapters to be implemented when the business supplies keys).

const PROVIDER = (process.env.SMS_PROVIDER || '').toLowerCase();

export const OTP_TEST_MODE =
  process.env.OTP_TEST_MODE === 'true' || PROVIDER === '';

export const sendSms = async (phone, message) => {
  if (OTP_TEST_MODE) {
    console.log(`📩 [SMS test-mode] to ${phone}: ${message}`);
    return { testMode: true };
  }

  switch (PROVIDER) {
    // case 'msg91': return sendViaMsg91(phone, message);
    // case 'twilio': return sendViaTwilio(phone, message);
    default:
      throw new Error(`SMS provider "${PROVIDER}" is not implemented`);
  }
};
