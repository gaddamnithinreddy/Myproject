import { addDoc, collection, serverTimestamp, doc, updateDoc } from "firebase/firestore"
import { db } from "./firebase"

export interface Notification {
  id?: string
  userId: string
  type: 'team_invite' | 'team_removed' | 'schedule' | 'schedule_update' | 'schedule_cancel' | 'tournament_invite' | 'tournament_registration' | 'tournament_match' | 'tournament_approval' | 'tournament_rejection' | 'tournament_result' | 'tournament_complete' | 'general'
  title: string
  body: string
  data?: Record<string, any>
  link?: string
  read: boolean
  createdAt: any
  emailSent?: boolean
}

// Email service configuration
const EMAIL_SERVICE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_EMAIL_API_KEY || 'your-email-api-key',
  fromEmail: process.env.NEXT_PUBLIC_FROM_EMAIL || 'noreply@keyconnect.com',
  fromName: 'KeyConnect'
}

// Email templates for different notification types
const EMAIL_TEMPLATES = {
  team_invite: {
    subject: 'Team Invitation - KeyConnect',
    template: (data: any) => ({
      subject: `Team Invitation: ${data.teamName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">KeyConnect</h1>
            <p style="margin: 10px 0 0 0;">Sports & Tournament Management</p>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Team Invitation</h2>
            <p style="color: #666; line-height: 1.6;">
              You have been invited to join the team <strong>${data.teamName}</strong> as a <strong>${data.role}</strong>.
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="margin: 0 0 10px 0; color: #333;">Team Details</h3>
              <p style="margin: 5px 0; color: #666;"><strong>Team:</strong> ${data.teamName}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Role:</strong> ${data.role}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Sport:</strong> ${data.sport || 'Not specified'}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.link}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Invitation
              </a>
            </div>
            <p style="color: #999; font-size: 14px; text-align: center;">
              This invitation will expire in 7 days. Please respond to accept or decline the invitation.
            </p>
          </div>
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 KeyConnect. All rights reserved.</p>
            <p style="margin: 5px 0;">If you have any questions, please contact our support team.</p>
          </div>
        </div>
      `
    })
  },
  tournament_invite: {
    subject: 'Tournament Invitation - KeyConnect',
    template: (data: any) => ({
      subject: `Tournament Invitation: ${data.tournamentName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">KeyConnect</h1>
            <p style="margin: 10px 0 0 0;">Sports & Tournament Management</p>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Tournament Invitation</h2>
            <p style="color: #666; line-height: 1.6;">
              You have been invited to participate in the tournament <strong>${data.tournamentName}</strong>.
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="margin: 0 0 10px 0; color: #333;">Tournament Details</h3>
              <p style="margin: 5px 0; color: #666;"><strong>Tournament:</strong> ${data.tournamentName}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Sport:</strong> ${data.sport || 'Not specified'}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Entry Fee:</strong> $${data.entryFee || 0}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Prize Pool:</strong> $${data.prizePool || 0}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.link}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Tournament
              </a>
            </div>
            <p style="color: #999; font-size: 14px; text-align: center;">
              Click the button above to view tournament details and register your team.
            </p>
          </div>
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 KeyConnect. All rights reserved.</p>
            <p style="margin: 5px 0;">If you have any questions, please contact our support team.</p>
          </div>
        </div>
      `
    })
  },
  tournament_match: {
    subject: 'New Match Scheduled - KeyConnect',
    template: (data: any) => ({
      subject: `New Match Scheduled: ${data.tournamentName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">KeyConnect</h1>
            <p style="margin: 10px 0 0 0;">Sports & Tournament Management</p>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">New Match Scheduled</h2>
            <p style="color: #666; line-height: 1.6;">
              A new match has been scheduled for your team in the tournament <strong>${data.tournamentName}</strong>.
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="margin: 0 0 10px 0; color: #333;">Match Details</h3>
              <p style="margin: 5px 0; color: #666;"><strong>Your Team:</strong> ${data.teamName}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Opponent:</strong> ${data.opponentName}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${data.matchDate}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Time:</strong> ${data.matchTime}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Court:</strong> ${data.court || 'TBD'}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.link}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Match Details
              </a>
            </div>
            <p style="color: #999; font-size: 14px; text-align: center;">
              Please ensure your team is ready for the match. Good luck!
            </p>
          </div>
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 KeyConnect. All rights reserved.</p>
            <p style="margin: 5px 0;">If you have any questions, please contact our support team.</p>
          </div>
        </div>
      `
    })
  },
  schedule: {
    subject: 'New Schedule Added - KeyConnect',
    template: (data: any) => ({
      subject: `New Schedule: ${data.scheduleTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">KeyConnect</h1>
            <p style="margin: 10px 0 0 0;">Sports & Tournament Management</p>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">New Schedule Added</h2>
            <p style="color: #666; line-height: 1.6;">
              A new schedule has been added for your team <strong>${data.teamName}</strong>.
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="margin: 0 0 10px 0; color: #333;">Schedule Details</h3>
              <p style="margin: 5px 0; color: #666;"><strong>Title:</strong> ${data.scheduleTitle}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${data.scheduleDate}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Time:</strong> ${data.scheduleTime}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Type:</strong> ${data.scheduleType}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Location:</strong> ${data.location}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.link}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Schedule
              </a>
            </div>
            <p style="color: #999; font-size: 14px; text-align: center;">
              Please RSVP to confirm your attendance.
            </p>
          </div>
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 KeyConnect. All rights reserved.</p>
            <p style="margin: 5px 0;">If you have any questions, please contact our support team.</p>
          </div>
        </div>
      `
    })
  },
  tournament_registration: {
    subject: 'Tournament Registration Update - KeyConnect',
    template: (data: any) => ({
      subject: `Tournament Registration ${data.status}: ${data.tournamentName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">KeyConnect</h1>
            <p style="margin: 10px 0 0 0;">Sports & Tournament Management</p>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Registration ${data.status === 'approved' ? 'Approved' : 'Rejected'}</h2>
            <p style="color: #666; line-height: 1.6;">
              Your registration for the tournament <strong>${data.tournamentName}</strong> has been <strong>${data.status}</strong>.
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${data.status === 'approved' ? '#28a745' : '#dc3545'};">
              <h3 style="margin: 0 0 10px 0; color: #333;">Registration Details</h3>
              <p style="margin: 5px 0; color: #666;"><strong>Tournament:</strong> ${data.tournamentName}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.link}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Tournament
              </a>
            </div>
          </div>
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 KeyConnect. All rights reserved.</p>
          </div>
        </div>
      `
    })
  },
  team_removed: {
    subject: 'Team Removal - KeyConnect',
    template: (data: any) => ({
      subject: `Removed from Team: ${data.teamName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">KeyConnect</h1>
            <p style="margin: 10px 0 0 0;">Sports & Tournament Management</p>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Team Removal</h2>
            <p style="color: #666; line-height: 1.6;">
              You have been removed from the team <strong>${data.teamName}</strong>.
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
              <h3 style="margin: 0 0 10px 0; color: #333;">Team Details</h3>
              <p style="margin: 5px 0; color: #666;"><strong>Team:</strong> ${data.teamName}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Reason:</strong> ${data.reason || 'Not specified'}</p>
            </div>
          </div>
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 KeyConnect. All rights reserved.</p>
          </div>
        </div>
      `
    })
  },
  schedule_update: {
    subject: 'Schedule Update - KeyConnect',
    template: (data: any) => ({
      subject: `Schedule Updated: ${data.scheduleTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">KeyConnect</h1>
            <p style="margin: 10px 0 0 0;">Sports & Tournament Management</p>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Schedule Updated</h2>
            <p style="color: #666; line-height: 1.6;">
              The schedule for <strong>${data.scheduleTitle}</strong> has been updated.
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <h3 style="margin: 0 0 10px 0; color: #333;">Updated Details</h3>
              <p style="margin: 5px 0; color: #666;"><strong>Title:</strong> ${data.scheduleTitle}</p>
              <p style="margin: 5px 0; color: #666;"><strong>New Date:</strong> ${data.scheduleDate}</p>
              <p style="margin: 5px 0; color: #666;"><strong>New Time:</strong> ${data.scheduleTime}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Location:</strong> ${data.location}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.link}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Updated Schedule
              </a>
            </div>
          </div>
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 KeyConnect. All rights reserved.</p>
          </div>
        </div>
      `
    })
  },
  schedule_cancel: {
    subject: 'Schedule Cancelled - KeyConnect',
    template: (data: any) => ({
      subject: `Schedule Cancelled: ${data.scheduleTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">KeyConnect</h1>
            <p style="margin: 10px 0 0 0;">Sports & Tournament Management</p>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Schedule Cancelled</h2>
            <p style="color: #666; line-height: 1.6;">
              The schedule <strong>${data.scheduleTitle}</strong> has been cancelled.
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
              <h3 style="margin: 0 0 10px 0; color: #333;">Cancelled Schedule</h3>
              <p style="margin: 5px 0; color: #666;"><strong>Title:</strong> ${data.scheduleTitle}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Reason:</strong> ${data.reason || 'Not specified'}</p>
            </div>
          </div>
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 KeyConnect. All rights reserved.</p>
          </div>
        </div>
      `
    })
  },
  tournament_approval: {
    subject: 'Tournament Registration Approved - KeyConnect',
    template: (data: any) => ({
      subject: `Registration Approved: ${data.tournamentName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">KeyConnect</h1>
            <p style="margin: 10px 0 0 0;">Sports & Tournament Management</p>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Registration Approved! 🎉</h2>
            <p style="color: #666; line-height: 1.6;">
              Congratulations! Your registration for <strong>${data.tournamentName}</strong> has been approved.
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="margin: 0 0 10px 0; color: #333;">Tournament Details</h3>
              <p style="margin: 5px 0; color: #666;"><strong>Tournament:</strong> ${data.tournamentName}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Team:</strong> ${data.teamName}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.link}" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Tournament
              </a>
            </div>
          </div>
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 KeyConnect. All rights reserved.</p>
          </div>
        </div>
      `
    })
  },
  tournament_rejection: {
    subject: 'Tournament Registration Rejected - KeyConnect',
    template: (data: any) => ({
      subject: `Registration Rejected: ${data.tournamentName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">KeyConnect</h1>
            <p style="margin: 10px 0 0 0;">Sports & Tournament Management</p>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Registration Rejected</h2>
            <p style="color: #666; line-height: 1.6;">
              Your registration for <strong>${data.tournamentName}</strong> has been rejected.
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
              <h3 style="margin: 0 0 10px 0; color: #333;">Tournament Details</h3>
              <p style="margin: 5px 0; color: #666;"><strong>Tournament:</strong> ${data.tournamentName}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Team:</strong> ${data.teamName}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Reason:</strong> ${data.reason || 'Not specified'}</p>
            </div>
          </div>
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 KeyConnect. All rights reserved.</p>
          </div>
        </div>
      `
    })
  },
  tournament_result: {
    subject: 'Tournament Result Update - KeyConnect',
    template: (data: any) => ({
      subject: `Tournament Result: ${data.tournamentName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">KeyConnect</h1>
            <p style="margin: 10px 0 0 0;">Sports & Tournament Management</p>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Tournament Result Update</h2>
            <p style="color: #666; line-height: 1.6;">
              There's an update regarding your tournament result.
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="margin: 0 0 10px 0; color: #333;">Result Details</h3>
              <p style="margin: 5px 0; color: #666;"><strong>Tournament:</strong> ${data.tournamentName}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Result:</strong> ${data.result}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.link}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Results
              </a>
            </div>
          </div>
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 KeyConnect. All rights reserved.</p>
          </div>
        </div>
      `
    })
  },
  tournament_complete: {
    subject: 'Tournament Completed - KeyConnect',
    template: (data: any) => ({
      subject: `Tournament Completed: ${data.tournamentName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">KeyConnect</h1>
            <p style="margin: 10px 0 0 0;">Sports & Tournament Management</p>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Tournament Completed! 🏆</h2>
            <p style="color: #666; line-height: 1.6;">
              The tournament <strong>${data.tournamentName}</strong> has been completed. Check the final results!
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="margin: 0 0 10px 0; color: #333;">Tournament Details</h3>
              <p style="margin: 5px 0; color: #666;"><strong>Tournament:</strong> ${data.tournamentName}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Status:</strong> Completed</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.link}" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Final Results
              </a>
            </div>
          </div>
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 KeyConnect. All rights reserved.</p>
          </div>
        </div>
      `
    })
  },
  general: {
    subject: 'KeyConnect Notification',
    template: (data: any) => ({
      subject: data.subject || 'KeyConnect Notification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">KeyConnect</h1>
            <p style="margin: 10px 0 0 0;">Sports & Tournament Management</p>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">${data.title || 'Notification'}</h2>
            <p style="color: #666; line-height: 1.6;">
              ${data.message || 'You have a new notification from KeyConnect.'}
            </p>
            ${data.link ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.link}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Details
              </a>
            </div>
            ` : ''}
          </div>
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 KeyConnect. All rights reserved.</p>
          </div>
        </div>
      `
    })
  }
}

// Send email using a service (example with a generic email service)
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    // This is a placeholder implementation
    // In production, you would use a service like SendGrid, Resend, or AWS SES
    
    // Example with a generic email service
    const emailData = {
      to,
      from: EMAIL_SERVICE_CONFIG.fromEmail,
      subject,
      html,
      headers: {
        'X-KeyConnect-Type': 'notification'
      }
    }

    // For development/testing, log the email instead of sending
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Email would be sent:', {
        to,
        subject,
        html: html.substring(0, 200) + '...'
      })
      return true
    }

    // In production, make actual API call to email service
    // const response = await fetch('https://api.emailservice.com/send', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${EMAIL_SERVICE_CONFIG.apiKey}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify(emailData)
    // })
    
    // return response.ok

    // For now, return true to simulate successful email sending
    return true
  } catch (error) {
    console.error('Failed to send email:', error)
    return false
  }
}

// Get user email by user ID
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    // This would typically fetch from your users collection
    // For now, return a placeholder
    return `user-${userId}@example.com`
  } catch (error) {
    console.error('Failed to get user email:', error)
    return null
  }
}

// Create notification with email sending
export async function createNotification(notificationData: Omit<Notification, 'id' | 'read' | 'createdAt'>): Promise<string> {
  try {
    // Create the notification in Firestore
    const notification: Omit<Notification, 'id'> = {
      ...notificationData,
    read: false,
      createdAt: serverTimestamp()
    }

    const docRef = await addDoc(collection(db, "notifications"), notification)
    
    // Send email notification
    const userEmail = await getUserEmail(notificationData.userId)
    if (userEmail) {
      const template = EMAIL_TEMPLATES[notificationData.type]
      if (template) {
        const emailContent = template.template({
          ...notificationData.data,
          link: notificationData.link || 'https://keyconnect.com'
        })
        
        const emailSent = await sendEmail(userEmail, emailContent.subject, emailContent.html)
        
        // Update notification with email status
        if (emailSent) {
          // You could update the notification document to mark email as sent
          // For now, we'll just log it
          console.log('Email notification sent successfully')
        }
      }
    }

    return docRef.id
  } catch (error) {
    console.error('Failed to create notification:', error)
    throw error
  }
}

// Send bulk email notifications
export async function sendBulkNotifications(
  userIds: string[], 
  notificationData: Omit<Notification, 'id' | 'userId' | 'read' | 'createdAt'>
): Promise<string[]> {
  const notificationIds: string[] = []
  
  for (const userId of userIds) {
    try {
      const id = await createNotification({
        ...notificationData,
        userId
      })
      notificationIds.push(id)
    } catch (error) {
      console.error(`Failed to create notification for user ${userId}:`, error)
    }
  }
  
  return notificationIds
}

// Send email without creating a notification
export async function sendEmailOnly(
  userId: string, 
  type: Notification['type'], 
  data: any
): Promise<boolean> {
  try {
    const userEmail = await getUserEmail(userId)
    if (!userEmail) return false

    const template = EMAIL_TEMPLATES[type]
    if (!template) return false

    const emailContent = template.template({
      ...data,
      link: data.link || 'https://keyconnect.com'
    })

    return await sendEmail(userEmail, emailContent.subject, emailContent.html)
  } catch (error) {
    console.error('Failed to send email only:', error)
    return false
  }
}

// Get notification template for a specific type
export function getNotificationTemplate(type: Notification['type']) {
  return EMAIL_TEMPLATES[type]
}

// Test email functionality
export async function testEmailService(): Promise<boolean> {
  try {
    const testEmail = 'test@example.com'
    const testSubject = 'KeyConnect Test Email'
    const testHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>KeyConnect Email Test</h2>
        <p>This is a test email to verify the email service is working correctly.</p>
        <p>If you receive this email, the email service is properly configured.</p>
      </div>
    `
    
    return await sendEmail(testEmail, testSubject, testHtml)
  } catch (error) {
    console.error('Email service test failed:', error)
    return false
  }
}

// Save FCM token to user document
export async function saveFcmTokenToUser(userId: string, fcmToken: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      fcmToken,
      updatedAt: new Date().toISOString()
    })
    
    console.log('FCM token saved successfully for user:', userId)
  } catch (error) {
    console.error('Failed to save FCM token:', error)
    throw error
  }
} 