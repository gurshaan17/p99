import type { Incident } from "./types";

export const backupJobSilentFailure = {
  slug: "backup-job-silent-failure",
  title: "The nightly backup job ran for years, but the bucket was empty",
  publishedAt: "2026-10-06",
  difficulty: "medium",
  topic: "databases",
  tags: ["backups", "disaster-recovery", "postgres", "silent-failure", "monitoring"],
  symptom:
    "Your product runs on one primary PostgreSQL server and one hot standby. Around 23:00 UTC, standby replication breaks, and the primary has already discarded the required log segments. You start rebuilding the standby. At about 23:30, someone wipes a data directory on the primary. Roughly 300 GB is gone, the standby was already emptied for its rebuild, and production is down. When you reach for backup, the S3 bucket is empty.",
  constraints: [
    "The standby exists for failover; it is not a disaster-recovery copy",
    "On paper there are four recovery mechanisms: a daily logical dump in S3, a daily disk snapshot in staging, disk snapshots, and replication",
    "Cloud disk snapshots are enabled for the file servers, but not for the database hosts",
    "PostgreSQL 9.6 is in use; the packaging supports 9.2 and 9.6 and picks binaries by reading the local data directory version",
    "The backup cron job runs on an application server, not on the database host",
    "Cron failure notices are sent by email",
    "Staging uses cheap, slow disks in a different region",
  ],
  evidence: [
    "The logical-dump S3 bucket is empty, and there is no recent dump anywhere on disk",
    "The job is enabled and still scheduled, but it has never produced a usable file",
    "The application server has no PostgreSQL data directory, so the packaging falls back to its default PostgreSQL 9.2 binaries, while the server is 9.6",
    "The dump tool failed every run on the major-version mismatch",
    "Cron sent a failure notice, but the receiving mail server rejected it because the sender was not DMARC-signed",
    "The standby was emptied for the rebuild, leaving no failover target",
    "Cloud disk snapshots were never enabled for the database hosts",
    "The newest usable copy is a hand-made snapshot about six hours old; the scheduled one is nearly 24 hours old",
    "Restoring means copying roughly the whole data directory from staging over throttled disks topping out around 60 Mbps",
    "Nobody was ever assigned to test restores",
  ],
  question:
    "Why did the backup never exist, why did no one find out for so long, and what turns backups configured into recovery proven?",
  picks: [
    {
      id: "why-bucket-empty",
      prompt: "Why was the bucket empty?",
      options: [
        { id: "retention-deleted", label: "A retention rule deleted the dumps too early" },
        { id: "upload-outage", label: "An S3 outage blocked every upload" },
        {
          id: "wrong-postgres-version",
          label: "The backup job selected PostgreSQL 9.2 tools and every dump failed",
        },
        { id: "engineer-deleted", label: "An engineer deleted the dumps during recovery" },
      ],
      answer: "wrong-postgres-version",
    },
    {
      id: "why-nobody-noticed",
      prompt: "Why did nobody notice the job failing?",
      options: [
        { id: "cron-silent", label: "Cron does not report failures" },
        { id: "zero-exit", label: "The job exited with status zero" },
        { id: "logs-rotated", label: "The logs were rotated before anyone read them" },
        {
          id: "alert-rejected",
          label: "The failure emails were rejected, so alerting failed too",
        },
      ],
      answer: "alert-rejected",
    },
    {
      id: "prove-recovery",
      prompt: "Which practice would have found this months earlier?",
      options: [
        { id: "bigger-disks", label: "Bigger disks on the database hosts" },
        { id: "second-job", label: "A second backup job writing to the same bucket" },
        { id: "more-replicas", label: "More replicas" },
        {
          id: "test-restores",
          label: "Automated test restores, alerting when no fresh restorable backup exists",
        },
      ],
      answer: "test-restores",
    },
  ],
  diagnosis: `The package selection failed because the backup ran on the application server. That host had no local PostgreSQL data directory, so the packaging fell back to PostgreSQL 9.2 binaries. Against a 9.6 server, the dump tool exited with an error every night. The schedule was healthy; the jobs themselves were not.

Nobody knew because the notification path was broken too. Cron sent failure mail, but the receiving server rejected it because the sender lacked DMARC signing. The visible result was a job that looked configured, while both its output path and its alert path had failed.

A hot standby is not a recovery target. It exists to take over during a failure, not to preserve an older or different state. Destructive changes replicate to it before anyone notices, and in this incident it was explicitly emptied for a rebuild.

The only usable copy was a hand-made snapshot, with no rehearsed restore path. The scheduled snapshot was almost a day old, and the copy had to move across slow staging disks, so the outage lasted long enough for data between about 17:20 and 23:30 UTC to be lost.`,
  fix: `Immediate recovery had to use the hand-made snapshot and accept the slow staging-to-production copy. No rollback to a clean backup was possible.

The durable fixes:

| Fix | Tradeoff |
| --- | --- |
| Run scheduled, automated test restores | Needs production-sized staging capacity and regular restore time |
| Alert on missing success, not just explicit failure | Needs a heartbeat outside the job's own alert path |
| Run backups on the database host or pin the PostgreSQL tool version | Tighter coupling between backup and database versions |
| Enable database disk snapshots and investigate continuous archiving | More storage and operational complexity, but less data loss |
| Assign an owner for backup durability and restore testing | Requires time and authority, not just a cron job |

Source: [Postmortem of database outage of January 31](https://about.gitlab.com/blog/postmortem-of-database-outage-of-january-31/)`,
  rubric: [
    {
      text: "Named the two independent failures: the dump tool picked the wrong PostgreSQL version and the alerting path also failed",
      dim: "correctness",
    },
    {
      text: "Separated replication/failover from a disaster-recovery copy",
      dim: "process",
    },
    {
      text: "Identified restore testing, success heartbeats, pinned versions, snapshots, and an owner as the missing recovery proof",
      dim: "depth",
    },
  ],
  remember: [
    "A backup job that has never produced a restorable artifact is not a backup; it is a schedule.",
    "Alert on the absence of success, not only on explicit failure. If the alert path can fail with the job, both need a heartbeat.",
    "Replication gives you continuity through many failures. It does not give you recovery from the destructive one.",
  ],
} satisfies Incident;
