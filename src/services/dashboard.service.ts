import { pool } from '../config/database';
import { UserModel } from '../models';

export class DashboardService {
  /**
   * Get system-wide user count (admin only)
   * Requirements: 10.1
   */
  static async getTotalUserCount(): Promise<number> {
    return UserModel.count();
  }

  /**
   * Get system-wide application count (admin only)
   * Requirements: 10.2
   */
  static async getTotalApplicationCount(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM applications';
    const result = await pool.query(query);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get top companies by application count (admin only)
   * Requirements: 10.3
   */
  static async getTopCompanies(limit: number = 10): Promise<Array<{ companyName: string; count: number }>> {
    const query = `
      SELECT company_name AS "companyName", COUNT(*) as count
      FROM applications
      GROUP BY company_name
      ORDER BY count DESC, company_name ASC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows.map(row => ({
      companyName: row.companyName,
      count: parseInt(row.count, 10)
    }));
  }

  /**
   * Calculate average response time from application creation to first status change (admin only)
   * Requirements: 10.4
   * 
   * This calculates the average time between when an application is created and when
   * its status is first changed (as recorded in the audit log).
   */
  static async getAverageResponseTime(): Promise<number | null> {
    const query = `
      SELECT AVG(
        EXTRACT(EPOCH FROM (audit_log.timestamp - applications.created_at))
      ) as avg_seconds
      FROM applications
      INNER JOIN (
        SELECT entity_id, MIN(timestamp) as timestamp
        FROM audit_log
        WHERE entity = 'application' 
          AND action = 'UPDATE'
          AND before_data->>'status' IS DISTINCT FROM after_data->>'status'
        GROUP BY entity_id
      ) audit_log ON applications.id = audit_log.entity_id::uuid
    `;
    
    const result = await pool.query(query);
    const avgSeconds = result.rows[0]?.avg_seconds;
    
    // Return null if no data, otherwise return average in seconds
    return avgSeconds ? parseFloat(avgSeconds) : null;
  }

  /**
   * Get all system statistics (admin only)
   * Requirements: 10.1, 10.2, 10.3, 10.4
   */
  static async getSystemStats() {
    const [totalUsers, totalApplications, topCompanies, avgResponseTime] = await Promise.all([
      this.getTotalUserCount(),
      this.getTotalApplicationCount(),
      this.getTopCompanies(10),
      this.getAverageResponseTime()
    ]);

    return {
      totalUsers,
      totalApplications,
      topCompanies,
      averageResponseTime: avgResponseTime
    };
  }
}
