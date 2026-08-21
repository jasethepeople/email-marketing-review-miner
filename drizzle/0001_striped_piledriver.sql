CREATE TABLE `ai_summary_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cacheKey` varchar(128) NOT NULL,
	`summary` json NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`lastUsedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_summary_cache_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_summary_cache_cacheKey_unique` UNIQUE(`cacheKey`)
);
