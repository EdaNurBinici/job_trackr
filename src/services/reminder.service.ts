/**
 * Reminder Service
 * Handles checking and sending reminders for job applications
 * Requirements: 15.1, 15.2, 15.3, 15.4
 */

import { pool } from '../config/database';
import { emailService } from './email.service';

export interface ReminderNotification {
  applicationId: string;
  userId: string;
  userEmail: string;
  companyName: string;
  position: string;
  reminderDate: string;
}

export class ReminderService {
  /**
   * Get all applications with due reminders (not yet sent)
   * Sends reminder 1 day before the reminder date at 18:00
   * Requirements: 15.2
   */
  static async getDueReminders(): Promise<ReminderNotification[]> {
    const query = `
      SELECT 
        a.id AS "applicationId",
        a.user_id AS "userId",
        u.email AS "userEmail",
        a.company_name AS "companyName",
        a.position,
        a.reminder_date AS "reminderDate"
      FROM applications a
      INNER JOIN users u ON a.user_id = u.id
      WHERE a.reminder_date IS NOT NULL
        AND a.reminder_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Istanbul')::date + INTERVAL '1 day'
        AND EXTRACT(HOUR FROM (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Istanbul')) >= 18
        AND NOT EXISTS (
          SELECT 1 FROM reminder_sent rs 
          WHERE rs.application_id = a.id
        )
      ORDER BY a.reminder_date ASC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Mark a reminder as sent
   * Requirements: 15.4
   */
  static async markReminderAsSent(applicationId: string): Promise<void> {
    const query = `
      INSERT INTO reminder_sent (application_id, sent_at)
      VALUES ($1, NOW())
      ON CONFLICT (application_id) DO NOTHING
    `;

    await pool.query(query, [applicationId]);
  }

  /**
   * Send reminder notification
   * Requirements: 15.3, 10.3
   */
  static async sendReminderNotification(reminder: ReminderNotification): Promise<void> {
    try {
      // Send email using emailService
      await emailService.sendReminderEmail(
        reminder.userEmail,
        reminder.companyName,
        reminder.position,
        new Date(reminder.reminderDate)
      );

      console.log(`[Reminder Service] Email sent to ${reminder.userEmail} for ${reminder.companyName}`);

      // Mark as sent to prevent duplicate notifications
      await this.markReminderAsSent(reminder.applicationId);
    } catch (error) {
      console.error(`[Reminder Service] Failed to send email to ${reminder.userEmail}:`, error);
      throw error;
    }
  }

  /**
   * Process all due reminders
   * Requirements: 15.2, 15.3, 15.4
   */
  static async processDueReminders(): Promise<number> {
    const dueReminders = await this.getDueReminders();
    
    console.log(`Found ${dueReminders.length} due reminders to process`);

    for (const reminder of dueReminders) {
      try {
        await this.sendReminderNotification(reminder);
      } catch (error) {
        console.error(`Failed to send reminder for application ${reminder.applicationId}:`, error);
        // Continue with other reminders even if one fails
      }
    }

    return dueReminders.length;
  }

  /**
   * Get reminder status for an application
   */
  static async getReminderStatus(applicationId: string): Promise<{ sent: boolean; sentAt?: Date }> {
    const query = `
      SELECT sent_at AS "sentAt"
      FROM reminder_sent
      WHERE application_id = $1
    `;

    const result = await pool.query(query, [applicationId]);
    
    if (result.rows.length > 0) {
      return {
        sent: true,
        sentAt: result.rows[0].sentAt
      };
    }

    return { sent: false };
  }
}
