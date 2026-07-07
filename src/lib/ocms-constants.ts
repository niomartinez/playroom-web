/** OCMS force-password-change / reset shared constants.
 *
 * Single source of truth on the FRONTEND (the backend counterpart lives in
 * app/constants.py — TEMP_PASSWORD / MIN_PASSWORD_LENGTH). Do NOT scatter
 * these literals across pages/routes.
 */

/** The password a reset always sets. A reset also flips
 *  admin_users.must_change_password = true so the user is forced to change it
 *  on next login. Mirrors backend app.constants.TEMP_PASSWORD. */
export const OCMS_TEMP_PASSWORD = "TempPass123!";

/** Minimum length for a user-chosen password (change-password flow).
 *  Mirrors backend app.constants.MIN_PASSWORD_LENGTH. */
export const OCMS_MIN_PASSWORD_LENGTH = 8;
