import {
	ButtonInteraction,
	ChannelType,
	ChatInputCommandInteraction,
	Collection,
	ComponentType,
	EmbedBuilder,
	InteractionContextType,
	NonThreadGuildBasedChannel,
	OverwriteResolvable,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import { SlashCommand } from "@/interfaces/slashCommand.js";
import { logger } from "@/utils/logger.js";
import { createConfirmationComponent } from "@/components/confirmationComponent.js";

export const archiveCategory: SlashCommand = {
	data: new SlashCommandBuilder()
		.setName("archive-category")
		.setDescription(
			"Move text channels from source category to target category and private them by default.",
		)
		.addChannelOption((option) =>
			option
				.setName("source")
				.setDescription("Category to archive under the target category.")
				.addChannelTypes(ChannelType.GuildCategory)
				.setRequired(true),
		)
		.addChannelOption((option) =>
			option
				.setName("target")
				.setDescription("Category to archive the source text channels under.")
				.addChannelTypes(ChannelType.GuildCategory)
				.setRequired(true),
		)
		.addBooleanOption((option) =>
			option
				.setName("delete")
				.setDescription(
					"Whether the source category gets deleted or not after the process is done.",
				)
				.setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName("prefix")
				.setDescription("String to prefix each channel name with.")
				.setRequired(false),
		)
		.addRoleOption((option) =>
			option
				.setName("view-role")
				.setDescription(
					"Role with view-only permissions on the archived channels.",
				)
				.setRequired(false),
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setContexts([InteractionContextType.Guild]),
	execute: async (interaction: ChatInputCommandInteraction) => {
		if (!interaction.guild) {
			await interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription("This command can only be used in servers."),
				],
			});

			return;
		}

		const interactionMessage = await interaction.reply({
			embeds: [
				new EmbedBuilder()
					.setColor("Blue")
					.setTitle("Confirmation")
					.setDescription(
						"Are you sure you want to archive this category and all its channels?",
					),
			],
			components: [createConfirmationComponent()],
		});

		let buttonInteraction: ButtonInteraction;

		try {
			buttonInteraction = await interactionMessage.awaitMessageComponent({
				componentType: ComponentType.Button,
				filter: (buttonInteraction) => {
					if (buttonInteraction.user.id !== interaction.user.id) {
						buttonInteraction.reply({
							embeds: [
								new EmbedBuilder()
									.setColor("Red")
									.setTitle("Error")
									.setDescription("You are not allowed to use this button."),
							],
							ephemeral: true,
						});

						return false;
					}

					return true;
				},
				time: 30_000,
			});
		} catch {
			await interactionMessage.edit({
				embeds: [
					new EmbedBuilder()
						.setColor("Yellow")
						.setTitle("Timed out")
						.setDescription(
							"The operation timed out. Make sure you respond within 30 seconds in order to complete the operation.",
						),
				],
				components: [],
			});

			return;
		}

		buttonInteraction.update({});

		if (buttonInteraction.customId === "confirmation-cancel-button") {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Green")
						.setTitle("Cancelled")
						.setDescription(
							"The operation was cancelled. No changes were made.",
						),
				],
				components: [],
			});

			return;
		}

		if (buttonInteraction.customId !== "confirmation-confirm-button") {
			return;
		}

		await interaction.editReply({ components: [] });

		const sourceOption = interaction.options.getChannel("source", true);
		const targetOption = interaction.options.getChannel("target", true);
		const deleteOption = interaction.options.getBoolean("delete", true);

		const prefixOption = interaction.options.getString("prefix", false);
		const viewRoleOption = interaction.options.getRole("view-role", false);

		const targetChannelPermissions: OverwriteResolvable[] = [
			{
				id: interaction.guild.roles.everyone,
				deny: [PermissionFlagsBits.ViewChannel],
			},
		];

		if (viewRoleOption) {
			targetChannelPermissions.push({
				id: viewRoleOption.id,
				allow: [PermissionFlagsBits.ViewChannel],
				deny: [PermissionFlagsBits.SendMessages],
			});
		}

		if (sourceOption.id === targetOption.id) {
			logger.error({
				type: "slash-command",
				commandName: interaction.commandName,
				userId: interaction.user.id,
				guildId: interaction.guild.id,
				message: `failed to archive category ${sourceOption.id} to ${targetOption.id}: source and target are the same`,
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							`\`The source category is the same as the target category.\``,
						),
				],
			});

			return;
		}

		let guildChannels: Collection<string, NonThreadGuildBasedChannel | null>;
		try {
			guildChannels = await interaction.guild.channels.fetch();
		} catch (error) {
			logger.error({
				type: "slash-command",
				commandName: interaction.commandName,
				userId: interaction.user.id,
				guildId: interaction.guild.id,
				message: `failed to fetch channels: ${error}`,
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							`Failed to fetch guild channels. Please try again later.`,
						),
				],
			});

			return;
		}

		const sourceChannels = guildChannels.filter(
			(ch) =>
				ch &&
				ch.parentId === sourceOption.id &&
				ch.type === ChannelType.GuildText,
		) as Collection<string, NonThreadGuildBasedChannel>;

		const targetChannels = guildChannels.filter(
			(ch) => ch && ch.parentId === targetOption.id,
		) as Collection<string, NonThreadGuildBasedChannel>;

		if (sourceChannels.size < 1) {
			logger.error({
				type: "slash-command",
				commandName: interaction.commandName,
				userId: interaction.user.id,
				guildId: interaction.guild.id,
				message: `failed to archive category ${sourceOption.id} to ${targetOption.id}: source category has no channels`,
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							`The source category has no text channels. Please try with a category that has text channels.`,
						),
				],
			});

			return;
		}

		if (sourceChannels.size + targetChannels.size > 50) {
			logger.error({
				type: "slash-command",
				commandName: interaction.commandName,
				userId: interaction.user.id,
				guildId: interaction.guild.id,
				message: `failed to archive category ${sourceOption.id} to ${targetOption.id}: target category would exceed channel limit`,
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Red")
						.setTitle("Error")
						.setDescription(
							"The target category has too many channels. Discord only allows 50 channels per category and this operation would exceed that limit.",
						),
				],
			});

			return;
		}

		const failedChannels: NonThreadGuildBasedChannel[] = [];

		for (const channel of sourceChannels.values()) {
			const channelName = prefixOption
				? `${prefixOption}-${channel.name}`
				: channel.name;

			try {
				await channel.edit({
					name: channelName,
					parent: targetOption.id,
					permissionOverwrites: targetChannelPermissions,
				});
			} catch (error) {
				logger.error({
					type: "slash-command",
					commandName: interaction.commandName,
					userId: interaction.user.id,
					guildId: interaction.guild.id,
					message: `failed to edit channel ${channel.id}: ${error}`,
				});

				failedChannels.push(channel);
				continue;
			}

			logger.info({
				type: "slash-command",
				commandName: interaction.commandName,
				userId: interaction.user.id,
				guildId: interaction.guild.id,
				message: `edited channel ${channel.id}`,
			});
		}

		if (failedChannels.length > 0) {
			logger.error({
				type: "slash-command",
				commandName: interaction.commandName,
				userId: interaction.user.id,
				guildId: interaction.guild.id,
				message: `partially archived category ${sourceOption.id} to ${targetOption.id}: ${failedChannels.length} channels failed`,
			});

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor("Yellow")
						.setTitle("Partial success")
						.setDescription(
							`The following channels failed to be archived: \n${failedChannels
								.map((ch) => `- <#${ch.id}>`)
								.join("\n")}`,
						),
				],
			});

			return;
		}

		if (deleteOption) {
			try {
				const sourceChannel = guildChannels.get(sourceOption.id);

				if (sourceChannel) await sourceChannel.delete();
			} catch (error) {
				logger.error({
					type: "slash-command",
					commandName: interaction.commandName,
					userId: interaction.user.id,
					guildId: interaction.guild.id,
					message: `failed to delete category ${sourceOption.id}: ${error}`,
				});

				logger.info({
					type: "slash-command",
					commandName: interaction.commandName,
					userId: interaction.user.id,
					guildId: interaction.guild.id,
					message: `partially archived category ${sourceOption.id} to ${targetOption.id}`,
				});

				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setColor("Yellow")
							.setTitle("Partial success")
							.setDescription(
								`The channels were archived, but the source category could not be deleted.`,
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
				message: `deleted category ${sourceOption.id}`,
			});
		}

		logger.info({
			type: "slash-command",
			commandName: interaction.commandName,
			userId: interaction.user.id,
			guildId: interaction.guild.id,
			message: `archived category ${sourceOption.id} to ${targetOption.id}`,
		});

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor("Green")
					.setTitle("Success")
					.setDescription(
						`The source category was archived under the target category.`,
					),
			],
		});
	},
};
