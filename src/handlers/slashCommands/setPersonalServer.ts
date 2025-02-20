import {
	EmbedBuilder,
	InteractionContextType,
	SlashCommandBuilder,
} from "discord.js";
import { SlashCommand } from "@/interfaces/slashCommand.js";
import { db } from "@/db/index.js";
import { logger } from "@/utils/logger.js";
import { users } from "@/db/schema.js";

export const setPersonalServer: SlashCommand = {
	data: new SlashCommandBuilder()
		.setName("set-personal-server")
		.setDescription("Set the current server as your personal server.")
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

		if (interaction.guild.ownerId !== interaction.user.id) {
			logger.error({
				type: "slash-command",
				commandName: interaction.commandName,
				userId: interaction.user.id,
				guildId: interaction.guild.id,
				message:
					"failed to set personal server: user is not the owner of the server",
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"You must be the owner of the server in order to set it as your personal server.",
						),
				],
			});

			return;
		}

		try {
			await db
				.insert(users)
				.values({
					discordId: interaction.user.id,
					personalServerId: interaction.guild.id,
				})
				.onConflictDoUpdate({
					target: [users.discordId],
					set: {
						personalServerId: interaction.guild.id,
					},
				});
		} catch (error) {
			logger.error({
				type: "slash-command",
				commandName: interaction.commandName,
				userId: interaction.user.id,
				guildId: interaction.guild.id,
				message: `failed to set personal server: ${error}`,
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"An error ocurred while trying to set your personal server. Please try again later.",
						),
				],
			});

			return;
		}

		logger.info({
			type: "slash-command",
			commandName: interaction.commandName,
			userId: interaction.user.id,
			guildId: interaction.guild.id,
			message: `set personal server to ${interaction.guild.id}`,
		});

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Green")
					.setTitle("Success")
					.setDescription(
						"The current server has been set as your personal server.",
					),
			],
		});
	},
};
