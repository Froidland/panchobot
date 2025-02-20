import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export function createConfirmationComponent() {
	const confirmationButton = new ButtonBuilder()
		.setCustomId("confirmation-confirm-button")
		.setLabel("Confirm")
		.setStyle(ButtonStyle.Success);

	const cancelButton = new ButtonBuilder()
		.setCustomId("confirmation-cancel-button")
		.setLabel("Cancel")
		.setStyle(ButtonStyle.Danger);

	return new ActionRowBuilder<ButtonBuilder>().addComponents(
		confirmationButton,
		cancelButton,
	);
}
