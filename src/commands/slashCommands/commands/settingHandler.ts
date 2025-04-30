import { CommandInteraction, SlashCommandBuilder, EmbedBuilder } from "discord.js";
import {
    setUserOccupationPreference,
    setUserTraitsPreference,
    setUserAdditionalInformationsPreference,
    getUserPreferences
} from "../../../dbClient";
import UserPreferences from "../../../types/UserPreferences";

const data = new SlashCommandBuilder()
    .setName("settings")
    .setDescription("Settings to change Meng's behavior")
    .addSubcommand((subcommand) =>
        subcommand
            .setName("list")
            .setDescription("List all available settings")
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("occupation")
            .setDescription(
                "Masukkan pekerjaan kamu (cth: mahasiswa, arsitek, seniman, dokter, dll)"
            )
            .addStringOption((option) =>
                option
                    .setRequired(true)
                    .setName("input")
                    .setDescription(
                        "Pekerjaan (cth: mahasiswa, arsitek, seniman, dokter, dll)"
                    )
            )
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("traits")
            .setDescription(
                "Masukkan sifat Meng (cth: pendiam, sombong, soft spoken, kreatif, julid, dll)"
            )
            .addStringOption((option) =>
                option
                    .setRequired(true)
                    .setName("input")
                    .setDescription(
                        "Sifat Meng (cth: pendiam, sombong, soft spoken, kreatif, julid, dll)"
                    )
            )
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("additional_informations")
            .setDescription(
                "Masukkan minat, nilai, atau preferensi (cth: suka catur, memiliki anjing, dll)"
            )
            .addStringOption((option) =>
                option
                    .setRequired(true)
                    .setName("input")
                    .setDescription(
                        "Masukkan minat, nilai, atau preferensi (cth: suka catur, memiliki anjing, dll)"
                    )
            )
    );

const execute = async (interaction: CommandInteraction) => {
    if (!interaction.isChatInputCommand()) return;

    await interaction.deferReply({flags: 'Ephemeral'});

    const subcommand = interaction.options.getSubcommand();
    const input = interaction.options.getString("input", false);
    const userId = interaction.user.id;
    
    let result: UserPreferences | null;
    let successMessage = '';
    let fieldName = '';

    try {
        if (subcommand === "occupation") {
            fieldName = 'occupation';
            result = await setUserOccupationPreference(userId, input!);
            successMessage = `Your occupation is set to: ${input}`;
        } else if (subcommand === "traits") {
            fieldName = 'traits';
            const traitsArray = input!.split(',').map(trait => trait.trim()).filter(trait => trait.length > 0);
            result = await setUserTraitsPreference(userId, traitsArray);
            successMessage = `Meng's traits are set to: ${traitsArray.join(', ')}`;
        } else if (subcommand === "additional_informations") {
            fieldName = 'additional informations';
            result = await setUserAdditionalInformationsPreference(userId, input!);
            successMessage = `Your additional information is set to: ${input}`;
        } else if (subcommand === "list") {
            fieldName = 'settings';
            result = await getUserPreferences(userId);
            successMessage = 'Here are your current settings:';
        } else {
            result = null;
            await interaction.editReply({ content: 'Unknown setting subcommand.' });
            return;
        }

        if (result) {
            const authorUsername = interaction.user.username;
            const fields = [];
            if (result.occupation) fields.push({name: 'Occupation', value: `Pekerjaan kamu adalah: \n**${result.occupation}**`, inline: false});
            if (result.traits) fields.push({name: 'Traits', value: `Sifat Meng:\n**${result.traits.join(', ')}**`, inline: false});
            if (result.additional_informations) fields.push({name: 'Additional ', value: `Informasi tambahan tentang kamu:\n**${result.additional_informations}**`, inline: false});
            
            const settingsEmbed = new EmbedBuilder()
                .setTitle(`Settings for ${authorUsername}`)
                .addFields(fields)
                .setFooter({ text: 'Meng ❤️' })
                .setTimestamp(new Date());
            await interaction.editReply({ embeds: [settingsEmbed] });
        } else {
            await interaction.editReply({ content: `Could not update your ${fieldName}. Please try again.` });
        }
    } catch (error) {
        console.error('Error handling setting command:', error);
        if (interaction.deferred || interaction.replied) {
             await interaction.editReply({ content: 'There was an error processing your setting request.' });
         } else {
             await interaction.reply({ content: 'There was an error processing your setting request.', ephemeral: true });
         }
    }
};



export { data, execute };