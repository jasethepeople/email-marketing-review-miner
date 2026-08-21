CREATE TABLE `ai_rubric_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`themeWeights` json NOT NULL,
	`minimumEvidenceCount` int NOT NULL,
	`maximumWords` int NOT NULL,
	`analysisPosture` varchar(32) NOT NULL,
	`changedBy` varchar(64) NOT NULL,
	`changeType` varchar(32) NOT NULL,
	`sourceVersionId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_rubric_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `source_refresh_settings` (
	`id` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`scheduleCronTaskUid` varchar(65),
	`lastRunAt` timestamp,
	`lastStatus` varchar(32),
	`lastResult` json,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `source_refresh_settings_id` PRIMARY KEY(`id`)
);
