/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { 
  User, 
  OtpVerification, 
  Activity, 
  ActivityParticipant, 
  Message, 
  Notification, 
  Report,
  ParticipantStatus,
  ReportStatus
} from '../../shared/types';

// Simple helper to generate random UUIDs without external packages
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'db.json');

interface DatabaseSchema {
  users: User[];
  otp_verifications: OtpVerification[];
  activities: Activity[];
  activity_participants: ActivityParticipant[];
  messages: Message[];
  notifications: Notification[];
  reports: Report[];
}

const initialDb: DatabaseSchema = {
  users: [],
  otp_verifications: [],
  activities: [],
  activity_participants: [],
  messages: [],
  notifications: [],
  reports: []
};

class RelationalDatabase {
  private data: DatabaseSchema = { ...initialDb };

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_PATH)) {
        const fileContent = fs.readFileSync(DB_PATH, 'utf-8');
        this.data = JSON.parse(fileContent);
        // Ensure all tables exist
        for (const key of Object.keys(initialDb) as Array<keyof DatabaseSchema>) {
          if (!this.data[key]) {
            (this.data as any)[key] = [];
          }
        }
      } else {
        this.save();
      }
    } catch (err) {
      console.error('Error loading database:', err);
      this.data = { ...initialDb };
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  // REPOSITORIES
  
  public users = {
    find: (filter?: Partial<User>): User[] => {
      return this.data.users.filter(u => {
        if (u.deletedAt !== null) return false;
        if (!filter) return true;
        return Object.entries(filter).every(([key, val]) => (u as any)[key] === val);
      });
    },
    findOne: (filter: Partial<User>): User | null => {
      const results = this.users.find(filter);
      return results.length > 0 ? results[0] : null;
    },
    save: (user: Partial<User> & { id?: string }): User => {
      const now = new Date().toISOString();
      if (user.id) {
        const index = this.data.users.findIndex(u => u.id === user.id && u.deletedAt === null);
        if (index !== -1) {
          const updated = {
            ...this.data.users[index],
            ...user,
            updatedAt: now
          };
          this.data.users[index] = updated;
          this.save();
          return updated;
        }
      }
      const newUser: User = {
        id: user.id || generateUUID(),
        name: user.name || 'Anonymous Buddy',
        email: user.email,
        phone: user.phone,
        avatar: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        bio: user.bio || '',
        interests: user.interests || [],
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      };
      this.data.users.push(newUser);
      this.save();
      return newUser;
    },
    softDelete: (id: string): boolean => {
      const index = this.data.users.findIndex(u => u.id === id);
      if (index !== -1) {
        this.data.users[index].deletedAt = new Date().toISOString();
        this.save();
        return true;
      }
      return false;
    }
  };

  public otp_verifications = {
    find: (filter?: Partial<OtpVerification>): OtpVerification[] => {
      return this.data.otp_verifications.filter(o => {
        if (!filter) return true;
        return Object.entries(filter).every(([key, val]) => (o as any)[key] === val);
      });
    },
    findOne: (filter: Partial<OtpVerification>): OtpVerification | null => {
      const results = this.otp_verifications.find(filter);
      return results.length > 0 ? results[0] : null;
    },
    save: (otp: Partial<OtpVerification>): OtpVerification => {
      const newOtp: OtpVerification = {
        id: generateUUID(),
        emailOrPhone: otp.emailOrPhone!,
        otp: otp.otp!,
        expiresAt: otp.expiresAt || new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 mins
        createdAt: new Date().toISOString()
      };
      this.data.otp_verifications.push(newOtp);
      this.save();
      return newOtp;
    },
    delete: (id: string): boolean => {
      const lenBefore = this.data.otp_verifications.length;
      this.data.otp_verifications = this.data.otp_verifications.filter(o => o.id !== id);
      if (this.data.otp_verifications.length !== lenBefore) {
        this.save();
        return true;
      }
      return false;
    },
    deleteByEmailOrPhone: (emailOrPhone: string) => {
      this.data.otp_verifications = this.data.otp_verifications.filter(o => o.emailOrPhone !== emailOrPhone);
      this.save();
    }
  };

  public activities = {
    find: (filter?: Partial<Activity>): Activity[] => {
      return this.data.activities.filter(a => {
        if (a.deletedAt !== null) return false;
        if (!filter) return true;
        return Object.entries(filter).every(([key, val]) => (a as any)[key] === val);
      });
    },
    findOne: (filter: Partial<Activity>): Activity | null => {
      const results = this.activities.find(filter);
      return results.length > 0 ? results[0] : null;
    },
    save: (activity: Partial<Activity> & { id?: string }): Activity => {
      const now = new Date().toISOString();
      if (activity.id) {
        const index = this.data.activities.findIndex(a => a.id === activity.id && a.deletedAt === null);
        if (index !== -1) {
          const updated = {
            ...this.data.activities[index],
            ...activity,
            updatedAt: now
          };
          this.data.activities[index] = updated;
          this.save();
          return updated;
        }
      }
      const newActivity: Activity = {
        id: activity.id || generateUUID(),
        title: activity.title!,
        description: activity.description!,
        category: activity.category!,
        date: activity.date!,
        time: activity.time!,
        location: activity.location!,
        slots: activity.slots!,
        creatorId: activity.creatorId!,
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      };
      this.data.activities.push(newActivity);
      this.save();
      return newActivity;
    },
    softDelete: (id: string): boolean => {
      const index = this.data.activities.findIndex(a => a.id === id);
      if (index !== -1) {
        this.data.activities[index].deletedAt = new Date().toISOString();
        // Soft delete all active participation as well
        this.save();
        return true;
      }
      return false;
    }
  };

  public activity_participants = {
    find: (filter?: Partial<ActivityParticipant>): ActivityParticipant[] => {
      return this.data.activity_participants.filter(p => {
        if (!filter) return true;
        return Object.entries(filter).every(([key, val]) => (p as any)[key] === val);
      });
    },
    findOne: (filter: Partial<ActivityParticipant>): ActivityParticipant | null => {
      const results = this.activity_participants.find(filter);
      return results.length > 0 ? results[0] : null;
    },
    save: (participant: Partial<ActivityParticipant> & { id?: string }): ActivityParticipant => {
      const now = new Date().toISOString();
      if (participant.id) {
        const index = this.data.activity_participants.findIndex(p => p.id === participant.id);
        if (index !== -1) {
          const updated = {
            ...this.data.activity_participants[index],
            ...participant,
            updatedAt: now
          };
          this.data.activity_participants[index] = updated;
          this.save();
          return updated;
        }
      }
      const newParticipant: ActivityParticipant = {
        id: participant.id || generateUUID(),
        activityId: participant.activityId!,
        userId: participant.userId!,
        status: participant.status || ParticipantStatus.PENDING,
        createdAt: now,
        updatedAt: now
      };
      this.data.activity_participants.push(newParticipant);
      this.save();
      return newParticipant;
    },
    delete: (id: string): boolean => {
      const lenBefore = this.data.activity_participants.length;
      this.data.activity_participants = this.data.activity_participants.filter(p => p.id !== id);
      if (this.data.activity_participants.length !== lenBefore) {
        this.save();
        return true;
      }
      return false;
    },
    deleteRequest: (activityId: string, userId: string): boolean => {
      const lenBefore = this.data.activity_participants.length;
      this.data.activity_participants = this.data.activity_participants.filter(
        p => !(p.activityId === activityId && p.userId === userId)
      );
      if (this.data.activity_participants.length !== lenBefore) {
        this.save();
        return true;
      }
      return false;
    }
  };

  public messages = {
    find: (filter?: Partial<Message>): Message[] => {
      return this.data.messages.filter(m => {
        if (!filter) return true;
        return Object.entries(filter).every(([key, val]) => (m as any)[key] === val);
      });
    },
    save: (msg: Partial<Message>): Message => {
      const now = new Date().toISOString();
      const newMessage: Message = {
        id: generateUUID(),
        activityId: msg.activityId!,
        senderId: msg.senderId!,
        senderName: msg.senderName || 'Anonymous',
        senderAvatar: msg.senderAvatar || '',
        content: msg.content!,
        createdAt: now
      };
      this.data.messages.push(newMessage);
      this.save();
      return newMessage;
    }
  };

  public notifications = {
    find: (filter?: Partial<Notification>): Notification[] => {
      return this.data.notifications.filter(n => {
        if (!filter) return true;
        return Object.entries(filter).every(([key, val]) => (n as any)[key] === val);
      });
    },
    save: (notif: Partial<Notification> & { id?: string }): Notification => {
      const now = new Date().toISOString();
      if (notif.id) {
        const index = this.data.notifications.findIndex(n => n.id === notif.id);
        if (index !== -1) {
          const updated = {
            ...this.data.notifications[index],
            ...notif
          };
          this.data.notifications[index] = updated;
          this.save();
          return updated;
        }
      }
      const newNotif: Notification = {
        id: notif.id || generateUUID(),
        userId: notif.userId!,
        type: notif.type!,
        title: notif.title!,
        content: notif.content!,
        isRead: notif.isRead || false,
        link: notif.link || '',
        createdAt: now
      };
      this.data.notifications.push(newNotif);
      this.save();
      return newNotif;
    },
    markAllAsRead: (userId: string) => {
      this.data.notifications.forEach(n => {
        if (n.userId === userId) {
          n.isRead = true;
        }
      });
      this.save();
    }
  };

  public reports = {
    find: (filter?: Partial<Report>): Report[] => {
      return this.data.reports.filter(r => {
        if (!filter) return true;
        return Object.entries(filter).every(([key, val]) => (r as any)[key] === val);
      });
    },
    save: (report: Partial<Report>): Report => {
      const newReport: Report = {
        id: generateUUID(),
        reporterId: report.reporterId!,
        reportedUserId: report.reportedUserId || null,
        reportedActivityId: report.reportedActivityId || null,
        reason: report.reason!,
        status: report.status || ReportStatus.PENDING,
        createdAt: new Date().toISOString()
      };
      this.data.reports.push(newReport);
      this.save();
      return newReport;
    }
  };
}

export const db = new RelationalDatabase();
