/** User-facing copy when stored FCM tokens are rejected (common on iOS Safari PWAs). */
export const FCM_STALE_TOKEN_USER_MESSAGE =
  "Notifications may need refresh on iOS. Try turning off and on again.";

export const FCM_NO_TOKENS_SELF_TEST =
  "No registered devices. Turn push on for this device first.";

export const FCM_NO_TOKENS_ADMIN_SINGLE =
  "No registered push devices for this user. They can enable push in Settings.";

export const FCM_SEND_FAILED_GENERIC =
  "Could not deliver the notification. The recipient can refresh the token or toggle push off and on in Settings.";
