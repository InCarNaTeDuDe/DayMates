/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Entity, PrimaryColumn, Column } from 'typeorm';
import { ActivityCategory, ParticipantStatus, ReportStatus } from '../../shared/types';

@Entity('users')
export class UserEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  phone?: string;

  @Column({ type: 'text' })
  avatar!: string;

  @Column({ type: 'text' })
  bio!: string;

  @Column('simple-array')
  interests!: string[];

  @Column({ type: 'varchar' })
  createdAt!: string;

  @Column({ type: 'varchar' })
  updatedAt!: string;

  @Column({ type: 'varchar', nullable: true })
  deletedAt!: string | null;
}

@Entity('otp_verifications')
export class OtpVerificationEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  emailOrPhone!: string;

  @Column({ type: 'varchar', length: 255 })
  otp!: string;

  @Column({ type: 'varchar' })
  expiresAt!: string;

  @Column({ type: 'varchar' })
  createdAt!: string;
}

@Entity('activities')
export class ActivityEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 50 })
  category!: ActivityCategory;

  @Column({ type: 'varchar' })
  date!: string;

  @Column({ type: 'varchar' })
  time!: string;

  @Column({ type: 'varchar', length: 255 })
  location!: string;

  @Column({ type: 'int' })
  slots!: number;

  @Column({ type: 'uuid' })
  creatorId!: string;

  @Column({ type: 'varchar' })
  createdAt!: string;

  @Column({ type: 'varchar' })
  updatedAt!: string;

  @Column({ type: 'varchar', nullable: true })
  deletedAt!: string | null;
}

@Entity('activity_participants')
export class ActivityParticipantEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  activityId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 50 })
  status!: ParticipantStatus;

  @Column({ type: 'varchar' })
  createdAt!: string;

  @Column({ type: 'varchar' })
  updatedAt!: string;
}

@Entity('messages')
export class MessageEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  activityId!: string;

  @Column({ type: 'uuid' })
  senderId!: string;

  @Column({ type: 'varchar', length: 255 })
  senderName!: string;

  @Column({ type: 'text' })
  senderAvatar!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'varchar' })
  createdAt!: string;
}

@Entity('notifications')
export class NotificationEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 50 })
  type!: 'JOIN_REQUEST' | 'JOIN_APPROVED' | 'JOIN_REJECTED' | 'NEW_MESSAGE';

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'boolean' })
  isRead!: boolean;

  @Column({ type: 'varchar', length: 255 })
  link!: string;

  @Column({ type: 'varchar' })
  createdAt!: string;
}

@Entity('reports')
export class ReportEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  reporterId!: string;

  @Column({ type: 'uuid', nullable: true })
  reportedUserId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  reportedActivityId!: string | null;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ type: 'varchar', length: 50 })
  status!: ReportStatus;

  @Column({ type: 'varchar' })
  createdAt!: string;
}
