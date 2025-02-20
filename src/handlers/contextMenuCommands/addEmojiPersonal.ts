import { ContextMenuCommand } from "@/interfaces/contextMenuCommand.js";
import {
	ContextMenuCommandBuilder,
	EmbedBuilder,
	GuildEmoji,
	InteractionContextType,
	MessageContextMenuCommandInteraction,
} from "discord.js";
import { db } from "@/db/index.js";
import { logger } from "@/utils/logger.js";
import { users } from "@/db/schema.js";
import { eq } from "drizzle-orm";
import { discordClient } from "@/discordClient.js";
import { emojiRegex } from "@/utils/regex.js";

export const addEmojiPersonal: ContextMenuCommand = {
	data: new ContextMenuCommandBuilder()
		.setName("Add emoji (personal)")
		.setType(3) // ApplicationCommandType.Message
		.setContexts([InteractionContextType.Guild]),
	execute: async (interaction) => {
		await interaction.deferReply();

		if (!interaction.guild) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("This command can only be used in servers."),
				],
			});

			return;
		}

		if (!(interaction instanceof MessageContextMenuCommandInteraction)) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("This command can only be used on messages."),
				],
			});

			return;
		}

		const user = await db.query.users.findFirst({
			where: eq(users.discordId, interaction.user.id),
		});

		if (!user || !user.personalServerId) {
			logger.error({
				type: "context-menu-command",
				commandName: interaction.commandName,
				userId: interaction.user.id,
				guildId: interaction.guild.id,
				message: `failed to add emoji to personal server: user doesn't have a personal server`,
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"You must set a personal server in order to use this command.",
						),
				],
			});

			return;
		}

		const userGuild =
			discordClient.guilds.cache.get(user.personalServerId) ||
			(await discordClient.guilds.fetch(user.personalServerId));

		if (!userGuild) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"An error ocurred while trying to get your personal server. Make sure the bot is present in your personal server.",
						),
				],
			});

			return;
		}

		if (userGuild.ownerId !== interaction.user.id) {
			logger.error({
				type: "context-menu-command",
				commandName: interaction.commandName,
				userId: interaction.user.id,
				guildId: interaction.guild.id,
				message: `failed to add emoji to personal server ${user.personalServerId}: user is not the owner of the personal server`,
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"You must be the owner of the personal server in order to use this command.",
						),
				],
			});

			return;
		}

		const emojiMatch = emojiRegex.exec(interaction.targetMessage.content);

		if (!emojiMatch) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("Invalid emoji."),
				],
			});

			return;
		}

		const [, animated, name, id] = emojiMatch;
		const url = `https://cdn.discordapp.com/emojis/${id}.${
			animated ? "gif" : "png"
		}`;

		const emojiResponse = await fetch(url);

		if (!emojiResponse.ok) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("Failed to fetch emoji."),
				],
			});

			return;
		}

		const emojiAttachment = Buffer.from(await emojiResponse.arrayBuffer());
		let createdEmoji: GuildEmoji;

		try {
			createdEmoji = await userGuild.emojis.create({
				name: name,
				attachment: emojiAttachment,
			});
		} catch (error) {
			logger.error({
				type: "context-menu-command",
				commandName: interaction.commandName,
				userId: interaction.user.id,
				guildId: interaction.guild.id,
				message: `failed to add emoji to personal server ${user.personalServerId}: ${error}`,
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"An error ocurred while trying to add the emoji. Please try again later.",
						),
				],
			});

			return;
		}

		logger.info({
			type: "context-menu-command",
			commandName: interaction.commandName,
			userId: interaction.user.id,
			guildId: interaction.guild.id,
			message: `added emoji ${createdEmoji.id} to personal guild ${userGuild.id}`,
		});

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Green")
					.setTitle("Success")
					.setDescription(
						`Added emoji ${createdEmoji} to your personal server.`,
					),
			],
		});
	},
};
