/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import { DataSource } from "typeorm";
import {
  User,
  OtpVerification,
  Activity,
  ActivityParticipant,
  Message,
  Notification,
  Report,
  ParticipantStatus,
  ReportStatus,
} from "../../shared/types";
import {
  UserEntity,
  OtpVerificationEntity,
  ActivityEntity,
  ActivityParticipantEntity,
  MessageEntity,
  NotificationEntity,
  ReportEntity,
} from "../entities";

// Simple helper to generate random UUIDs without external packages
export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// TypeORM Data Source - Configured with standard placeholder options
export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "placeholder_password",
  database: process.env.DB_DATABASE || "daymates_db",
  synchronize: true, // Automatically synchronize schema changes in development
  logging: false,
  entities: [
    UserEntity,
    OtpVerificationEntity,
    ActivityEntity,
    ActivityParticipantEntity,
    MessageEntity,
    NotificationEntity,
    ReportEntity,
  ],
  ssl:
    process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  extra: {
    connectionTimeoutMillis: 5000, // Timeout fast if Postgres is down
  },
});

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "db.json");

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
  reports: [],
};

class RelationalDatabase {
  private data: DatabaseSchema = { ...initialDb };
  private typeORMEnabled = false;

  constructor() {
    this.load();
  }

  // Initialize TypeORM dynamically (called on server boot)
  public async initializeTypeORM() {
    try {
      console.log(
        "[TypeORM] Initializing connection to PostgreSQL database...",
      );
      console.log(
        `[TypeORM] Config: Host=${process.env.DB_HOST || "localhost"}, Port=${process.env.DB_PORT || "5432"}, DB=${process.env.DB_DATABASE || "daymates_db"}`,
      );

      await AppDataSource.initialize();
      this.typeORMEnabled = true;
      console.log("[TypeORM] Successfully connected to PostgreSQL database!");

      // Run synchronization / hydration from PostgreSQL
      await this.syncFromTypeORM();
    } catch (err: any) {
      console.warn(
        "================================================================",
      );
      console.warn(
        "[TypeORM WARNING] Failed to connect to PostgreSQL database.",
      );
      console.warn("[TypeORM WARNING] Error details:", err?.message || err);
      console.warn(
        "[TypeORM WARNING] Running in HIGH-FIDELITY SANDBOX MODE using local JSON-file engine.",
      );
      console.warn(
        "[TypeORM WARNING] Configure the DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, and DB_DATABASE env vars to connect to a real PostgreSQL instance.",
      );
      console.warn(
        "================================================================",
      );
    }
  }

  // Hydrate local cache from PostgreSQL database on successful initialization
  private async syncFromTypeORM() {
    try {
      const userRepo = AppDataSource.getRepository(UserEntity);
      const otpRepo = AppDataSource.getRepository(OtpVerificationEntity);
      const activityRepo = AppDataSource.getRepository(ActivityEntity);
      const partRepo = AppDataSource.getRepository(ActivityParticipantEntity);
      const msgRepo = AppDataSource.getRepository(MessageEntity);
      const notifRepo = AppDataSource.getRepository(NotificationEntity);
      const reportRepo = AppDataSource.getRepository(ReportEntity);

      const dbUsers = await userRepo.find();
      const dbOtps = await otpRepo.find();
      const dbActivities = await activityRepo.find();
      const dbParts = await partRepo.find();
      const dbMsgs = await msgRepo.find();
      const dbNotifs = await notifRepo.find();
      const dbReports = await reportRepo.find();

      const formattedUsers = dbUsers.map((u) => ({
        ...u,
        interests: Array.isArray(u.interests)
          ? u.interests
          : typeof u.interests === "string"
            ? (u.interests as string).split(",")
            : [],
      }));

      // Seeding logic: if Postgres tables are completely empty but local JSON DB has existing data, seed the SQL database!
      if (dbUsers.length === 0 && this.data.users.length > 0) {
        console.log(
          "[TypeORM] Seeding local database cache into empty PostgreSQL database...",
        );

        for (const u of this.data.users) {
          const uEnt = new UserEntity();
          Object.assign(uEnt, u);
          await userRepo.save(uEnt);
        }
        for (const o of this.data.otp_verifications) {
          const oEnt = new OtpVerificationEntity();
          Object.assign(oEnt, o);
          await otpRepo.save(oEnt);
        }
        for (const a of this.data.activities) {
          const aEnt = new ActivityEntity();
          Object.assign(aEnt, a);
          await activityRepo.save(aEnt);
        }
        for (const p of this.data.activity_participants) {
          const pEnt = new ActivityParticipantEntity();
          Object.assign(pEnt, p);
          await partRepo.save(pEnt);
        }
        for (const m of this.data.messages) {
          const mEnt = new MessageEntity();
          Object.assign(mEnt, m);
          await msgRepo.save(mEnt);
        }
        for (const n of this.data.notifications) {
          const nEnt = new NotificationEntity();
          Object.assign(nEnt, n);
          await notifRepo.save(nEnt);
        }
        for (const r of this.data.reports) {
          const rEnt = new ReportEntity();
          Object.assign(rEnt, r);
          await reportRepo.save(rEnt);
        }

        console.log(
          "[TypeORM] Local cache successfully seeded into PostgreSQL!",
        );
        return;
      }

      // Populate memory cache with data from PostgreSQL
      this.data.users = formattedUsers;
      this.data.otp_verifications = dbOtps;
      this.data.activities = dbActivities;
      this.data.activity_participants = dbParts;
      this.data.messages = dbMsgs;
      this.data.notifications = dbNotifs;
      this.data.reports = dbReports;

      this.save();
      console.log(
        "[TypeORM] Successfully loaded and synchronized database records from PostgreSQL into memory!",
      );
    } catch (err) {
      console.error("[TypeORM] Failed to sync data from PostgreSQL:", err);
    }
  }

  private load() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_PATH)) {
        const fileContent = fs.readFileSync(DB_PATH, "utf-8");
        this.data = JSON.parse(fileContent);
        // Ensure all tables exist
        for (const key of Object.keys(initialDb) as Array<
          keyof DatabaseSchema
        >) {
          if (!this.data[key]) {
            (this.data as any)[key] = [];
          }
        }
      } else {
        this.save();
      }
    } catch (err) {
      console.error("Error loading database:", err);
      this.data = { ...initialDb };
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (err) {
      console.error("Error saving database:", err);
    }
  }

  // REPOSITORIES PATTERN (TypeORM compliant background write-through)

  public users = {
    find: (filter?: Partial<User>): User[] => {
      return this.data.users.filter((u) => {
        if (u.deletedAt !== null) return false;
        if (!filter) return true;
        return Object.entries(filter).every(
          ([key, val]) => (u as any)[key] === val,
        );
      });
    },
    findOne: (filter: Partial<User>): User | null => {
      const results = this.users.find(filter);
      return results.length > 0 ? results[0] : null;
    },
    save: (user: Partial<User> & { id?: string }): User => {
      const now = new Date().toISOString();
      let savedUser: User;

      if (user.id) {
        const index = this.data.users.findIndex(
          (u) => u.id === user.id && u.deletedAt === null,
        );
        if (index !== -1) {
          savedUser = {
            ...this.data.users[index],
            ...user,
            updatedAt: now,
          };
          this.data.users[index] = savedUser;
        } else {
          savedUser = {
            id: user.id,
            name: user.name || "Anonymous Buddy",
            email: user.email,
            phone: user.phone,
            avatar:
              user.avatar ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
            bio: user.bio || "",
            interests: user.interests || [],
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          };
          this.data.users.push(savedUser);
        }
      } else {
        savedUser = {
          id: generateUUID(),
          name: user.name || "Anonymous Buddy",
          email: user.email,
          phone: user.phone,
          avatar:
            user.avatar ||
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
          bio: user.bio || "",
          interests: user.interests || [],
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        this.data.users.push(savedUser);
      }

      this.save();

      // Write-Through to TypeORM PostgreSQL
      if (this.typeORMEnabled) {
        const repo = AppDataSource.getRepository(UserEntity);
        const entity = new UserEntity();
        Object.assign(entity, savedUser);
        repo
          .save(entity)
          .catch((err) => console.error("[TypeORM User Save Error]", err));
      }

      return savedUser;
    },
    softDelete: (id: string): boolean => {
      const index = this.data.users.findIndex((u) => u.id === id);
      if (index !== -1) {
        const now = new Date().toISOString();
        this.data.users[index].deletedAt = now;
        this.save();

        if (this.typeORMEnabled) {
          const repo = AppDataSource.getRepository(UserEntity);
          repo
            .update(id, { deletedAt: now })
            .catch((err) => console.error("[TypeORM User Delete Error]", err));
        }
        return true;
      }
      return false;
    },
  };

  public otp_verifications = {
    find: (filter?: Partial<OtpVerification>): OtpVerification[] => {
      return this.data.otp_verifications.filter((o) => {
        if (!filter) return true;
        return Object.entries(filter).every(
          ([key, val]) => (o as any)[key] === val,
        );
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
        expiresAt:
          otp.expiresAt || new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 mins
        createdAt: new Date().toISOString(),
      };
      this.data.otp_verifications.push(newOtp);
      this.save();

      if (this.typeORMEnabled) {
        const repo = AppDataSource.getRepository(OtpVerificationEntity);
        const entity = new OtpVerificationEntity();
        Object.assign(entity, newOtp);
        repo
          .save(entity)
          .catch((err) => console.error("[TypeORM OTP Save Error]", err));
      }

      return newOtp;
    },
    delete: (id: string): boolean => {
      const lenBefore = this.data.otp_verifications.length;
      this.data.otp_verifications = this.data.otp_verifications.filter(
        (o) => o.id !== id,
      );
      if (this.data.otp_verifications.length !== lenBefore) {
        this.save();

        if (this.typeORMEnabled) {
          const repo = AppDataSource.getRepository(OtpVerificationEntity);
          repo
            .delete(id)
            .catch((err) => console.error("[TypeORM OTP Delete Error]", err));
        }
        return true;
      }
      return false;
    },
    deleteByEmailOrPhone: (emailOrPhone: string) => {
      this.data.otp_verifications = this.data.otp_verifications.filter(
        (o) => o.emailOrPhone !== emailOrPhone,
      );
      this.save();

      if (this.typeORMEnabled) {
        const repo = AppDataSource.getRepository(OtpVerificationEntity);
        repo
          .delete({ emailOrPhone })
          .catch((err) =>
            console.error("[TypeORM OTP DeleteByEmail Error]", err),
          );
      }
    },
  };

  public activities = {
    find: (filter?: Partial<Activity>): Activity[] => {
      return this.data.activities.filter((a) => {
        if (a.deletedAt !== null) return false;
        if (!filter) return true;
        return Object.entries(filter).every(
          ([key, val]) => (a as any)[key] === val,
        );
      });
    },
    findOne: (filter: Partial<Activity>): Activity | null => {
      const results = this.activities.find(filter);
      return results.length > 0 ? results[0] : null;
    },
    save: (activity: Partial<Activity> & { id?: string }): Activity => {
      const now = new Date().toISOString();
      let savedActivity: Activity;

      if (activity.id) {
        const index = this.data.activities.findIndex(
          (a) => a.id === activity.id && a.deletedAt === null,
        );
        if (index !== -1) {
          savedActivity = {
            ...this.data.activities[index],
            ...activity,
            updatedAt: now,
          };
          this.data.activities[index] = savedActivity;
        } else {
          savedActivity = {
            id: activity.id,
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
            deletedAt: null,
          };
          this.data.activities.push(savedActivity);
        }
      } else {
        savedActivity = {
          id: generateUUID(),
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
          deletedAt: null,
        };
        this.data.activities.push(savedActivity);
      }

      this.save();

      if (this.typeORMEnabled) {
        const repo = AppDataSource.getRepository(ActivityEntity);
        const entity = new ActivityEntity();
        Object.assign(entity, savedActivity);
        repo
          .save(entity)
          .catch((err) => console.error("[TypeORM Activity Save Error]", err));
      }

      return savedActivity;
    },
    softDelete: (id: string): boolean => {
      const index = this.data.activities.findIndex((a) => a.id === id);
      if (index !== -1) {
        const now = new Date().toISOString();
        this.data.activities[index].deletedAt = now;
        this.save();

        if (this.typeORMEnabled) {
          const repo = AppDataSource.getRepository(ActivityEntity);
          repo
            .update(id, { deletedAt: now })
            .catch((err) =>
              console.error("[TypeORM Activity Delete Error]", err),
            );
        }
        return true;
      }
      return false;
    },
  };

  public activity_participants = {
    find: (filter?: Partial<ActivityParticipant>): ActivityParticipant[] => {
      return this.data.activity_participants.filter((p) => {
        if (!filter) return true;
        return Object.entries(filter).every(
          ([key, val]) => (p as any)[key] === val,
        );
      });
    },
    findOne: (
      filter: Partial<ActivityParticipant>,
    ): ActivityParticipant | null => {
      const results = this.activity_participants.find(filter);
      return results.length > 0 ? results[0] : null;
    },
    save: (
      participant: Partial<ActivityParticipant> & { id?: string },
    ): ActivityParticipant => {
      const now = new Date().toISOString();
      let savedParticipant: ActivityParticipant;

      if (participant.id) {
        const index = this.data.activity_participants.findIndex(
          (p) => p.id === participant.id,
        );
        if (index !== -1) {
          savedParticipant = {
            ...this.data.activity_participants[index],
            ...participant,
            updatedAt: now,
          };
          this.data.activity_participants[index] = savedParticipant;
        } else {
          savedParticipant = {
            id: participant.id,
            activityId: participant.activityId!,
            userId: participant.userId!,
            status: participant.status || ParticipantStatus.PENDING,
            createdAt: now,
            updatedAt: now,
          };
          this.data.activity_participants.push(savedParticipant);
        }
      } else {
        savedParticipant = {
          id: generateUUID(),
          activityId: participant.activityId!,
          userId: participant.userId!,
          status: participant.status || ParticipantStatus.PENDING,
          createdAt: now,
          updatedAt: now,
        };
        this.data.activity_participants.push(savedParticipant);
      }

      this.save();

      if (this.typeORMEnabled) {
        const repo = AppDataSource.getRepository(ActivityParticipantEntity);
        const entity = new ActivityParticipantEntity();
        Object.assign(entity, savedParticipant);
        repo
          .save(entity)
          .catch((err) =>
            console.error("[TypeORM Participant Save Error]", err),
          );
      }

      return savedParticipant;
    },
    delete: (id: string): boolean => {
      const lenBefore = this.data.activity_participants.length;
      this.data.activity_participants = this.data.activity_participants.filter(
        (p) => p.id !== id,
      );
      if (this.data.activity_participants.length !== lenBefore) {
        this.save();

        if (this.typeORMEnabled) {
          const repo = AppDataSource.getRepository(ActivityParticipantEntity);
          repo
            .delete(id)
            .catch((err) =>
              console.error("[TypeORM Participant Delete Error]", err),
            );
        }
        return true;
      }
      return false;
    },
    deleteRequest: (activityId: string, userId: string): boolean => {
      const lenBefore = this.data.activity_participants.length;
      this.data.activity_participants = this.data.activity_participants.filter(
        (p) => !(p.activityId === activityId && p.userId === userId),
      );
      if (this.data.activity_participants.length !== lenBefore) {
        this.save();

        if (this.typeORMEnabled) {
          const repo = AppDataSource.getRepository(ActivityParticipantEntity);
          repo
            .delete({ activityId, userId })
            .catch((err) =>
              console.error("[TypeORM Participant DeleteRequest Error]", err),
            );
        }
        return true;
      }
      return false;
    },
  };

  public messages = {
    find: (filter?: Partial<Message>): Message[] => {
      return this.data.messages.filter((m) => {
        if (!filter) return true;
        return Object.entries(filter).every(
          ([key, val]) => (m as any)[key] === val,
        );
      });
    },
    save: (msg: Partial<Message>): Message => {
      const now = new Date().toISOString();
      const newMessage: Message = {
        id: generateUUID(),
        activityId: msg.activityId!,
        senderId: msg.senderId!,
        senderName: msg.senderName || "Anonymous",
        senderAvatar: msg.senderAvatar || "",
        content: msg.content!,
        createdAt: now,
      };
      this.data.messages.push(newMessage);
      this.save();

      if (this.typeORMEnabled) {
        const repo = AppDataSource.getRepository(MessageEntity);
        const entity = new MessageEntity();
        Object.assign(entity, newMessage);
        repo
          .save(entity)
          .catch((err) => console.error("[TypeORM Message Save Error]", err));
      }

      return newMessage;
    },
  };

  public notifications = {
    find: (filter?: Partial<Notification>): Notification[] => {
      return this.data.notifications.filter((n) => {
        if (!filter) return true;
        return Object.entries(filter).every(
          ([key, val]) => (n as any)[key] === val,
        );
      });
    },
    save: (notif: Partial<Notification> & { id?: string }): Notification => {
      const now = new Date().toISOString();
      let savedNotif: Notification;

      if (notif.id) {
        const index = this.data.notifications.findIndex(
          (n) => n.id === notif.id,
        );
        if (index !== -1) {
          savedNotif = {
            ...this.data.notifications[index],
            ...notif,
          };
          this.data.notifications[index] = savedNotif;
        } else {
          savedNotif = {
            id: notif.id,
            userId: notif.userId!,
            type: notif.type!,
            title: notif.title!,
            content: notif.content!,
            isRead: notif.isRead || false,
            link: notif.link || "",
            createdAt: now,
          };
          this.data.notifications.push(savedNotif);
        }
      } else {
        savedNotif = {
          id: generateUUID(),
          userId: notif.userId!,
          type: notif.type!,
          title: notif.title!,
          content: notif.content!,
          isRead: notif.isRead || false,
          link: notif.link || "",
          createdAt: now,
        };
        this.data.notifications.push(savedNotif);
      }

      this.save();

      if (this.typeORMEnabled) {
        const repo = AppDataSource.getRepository(NotificationEntity);
        const entity = new NotificationEntity();
        Object.assign(entity, savedNotif);
        repo
          .save(entity)
          .catch((err) =>
            console.error("[TypeORM Notification Save Error]", err),
          );
      }

      return savedNotif;
    },
    markAllAsRead: (userId: string) => {
      this.data.notifications.forEach((n) => {
        if (n.userId === userId) {
          n.isRead = true;
        }
      });
      this.save();

      if (this.typeORMEnabled) {
        const repo = AppDataSource.getRepository(NotificationEntity);
        repo
          .update({ userId }, { isRead: true })
          .catch((err) =>
            console.error("[TypeORM Notification MarkRead Error]", err),
          );
      }
    },
  };

  public reports = {
    find: (filter?: Partial<Report>): Report[] => {
      return this.data.reports.filter((r) => {
        if (!filter) return true;
        return Object.entries(filter).every(
          ([key, val]) => (r as any)[key] === val,
        );
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
        createdAt: new Date().toISOString(),
      };
      this.data.reports.push(newReport);
      this.save();

      if (this.typeORMEnabled) {
        const repo = AppDataSource.getRepository(ReportEntity);
        const entity = new ReportEntity();
        Object.assign(entity, newReport);
        repo
          .save(entity)
          .catch((err) => console.error("[TypeORM Report Save Error]", err));
      }

      return newReport;
    },
  };
}

export const db = new RelationalDatabase();
