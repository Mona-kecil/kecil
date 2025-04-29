import { CommandInteraction, SlashCommandBuilder } from "discord.js";

const data = new SlashCommandBuilder()
    .setName("settings")
    .addSubcommand((subcommand) =>
        subcommand
            .setName("Pekerjaan")
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

    await interaction.deferReply({ ephemeral: true });
    const subcommand = interaction.options.getSubcommand();
    const input = interaction.options.getString("input", true);

    if (subcommand === "occupation") {
        await interaction.editReply({
            content: `Your occupation is set to ${input}.`,
        });
    }

    if (subcommand === "traits") {
        await interaction.editReply({
            content: `Your traits are set to ${input}.`,
        });
    }

    if (subcommand === "additional_informations") {
        await interaction.editReply({
            content: `Your additional informations are set to ${input}.`,
        });
    }
};

export { data, execute };
