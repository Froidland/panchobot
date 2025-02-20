import { ActivityType, Events } from "discord.js";
import { logger } from "./utils/logger.js";
import { onInteraction } from "@/events/onInteraction.js";
import { onMessageCreate } from "@/events/onMessageCreate.js";
import { onReady } from "@/events/onReady.js";
import { discordClient } from "@/discordClient.js";
import "@/db/index.js";

discordClient.once(Events.ClientReady, async (client) => {
	logger.info({
		type: "system",
		commandName: null,
		userId: null,
		guildId: null,
		message: `logged in as ${client.user.tag}`,
	});

	client.user.setPresence({
		status: "online",
		activities: [
			{
				name: ">:3",
				type: ActivityType.Competing,
			},
		],
	});

	try {
		await onReady(client);
	} catch (error) {
		logger.error({
			type: "system",
			commandName: null,
			userId: null,
			guildId: null,
			message: `error while trying to register commands: ${error}`,
		});

		process.exit(1);
	}
});

discordClient.on(Events.InteractionCreate, (interaction) => {
	onInteraction(interaction).catch((error) => {
		logger.error({
			type: "system",
			commandName: null,
			userId: interaction.user.id,
			guildId: interaction.guild?.id || null,
			message: `InteractionError: ${error}`,
		});
	});
});

discordClient.on(Events.Error, (error) => {
	logger.error({
		type: "system",
		commandName: null,
		userId: null,
		guildId: null,
		message: `DiscordError: ${error}`,
	});

	if (error.name == "ConnectTimeoutError") {
		process.exit(1);
	}
});

discordClient.on(Events.MessageCreate, (message) => {
	onMessageCreate(message);
});

try {
	await discordClient.login(process.env.BOT_TOKEN);
} catch (error) {
	logger.error({
		type: "system",
		commandName: null,
		userId: null,
		guildId: null,
		message: `error while trying to start the bot: ${error}`,
	});

	process.exit(1);
}
