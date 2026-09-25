import { sendEmail } from "../utils/sendEmail.js";

export const sendNotificationEmail = async ({ to, subject, html }) => {
  if (!to || !subject || !html) return;
  await sendEmail(to, subject, html);
};
