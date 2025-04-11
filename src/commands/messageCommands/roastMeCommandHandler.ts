import { Message, User } from "discord.js";
import { getUserMessagesHistory } from "../../dbClient";
import { AI } from "../../config";

export default async function roastMeCommandHandler(message: Message<boolean>, author: User, model: string = "gemini-2.0-flash") {
    const authorId = author.id;
    const history = await getUserMessagesHistory(authorId, 100);
    
    if (!history || history.length === 0) {
        try {
            message.reply({
                content: `Hi, <@${authorId}>.\nSorry, I can't seem to find any of your chat history. I can't roast you if I don't know you!.`,
                allowedMentions: {repliedUser: true}
            });
            return;
        } catch (error) {
            console.error(`[ERROR] ${error}`);
            return;
        }
    }

    const formattedHistory = history
        .map(msg => msg.content.trim())
        .filter(content => content.length > 0)
        .map(content => content.substring(0, 1024))
        .join('\n');

    const getHistoryContextPrompt = `Anda akan menerima riwayat obrolan (chat history) dari Discord. Tugas Anda adalah meningkatkan kejelasan riwayat obrolan ini dengan menambahkan penjelasan kontekstual jika diperlukan.

    Analisis keseluruhan alur obrolan yang diberikan untuk memahami dinamika percakapan.
    
    Tambahkan konteks terutama untuk pesan-pesan yang:
    1.  Terlihat seperti balasan untuk pesan sebelumnya yang tidak ada dalam riwayat.
    2.  Sangat singkat, ambigu, menggunakan bahasa gaul (slang), atau tampak seperti lelucon internal (inside joke) yang sulit dipahami.
    3.  Menandai perubahan topik yang tiba-tiba.
    
    Konteks yang Anda tambahkan harus bertujuan untuk memperjelas situasi. Ini bisa berarti:
    - Menjelaskan kemungkinan tindakan atau peristiwa sebelumnya yang memicu pesan tersebut.
    - ATAU menjelaskan maksud/makna dari pesan saat ini jika pesan itu sendiri tidak jelas.
    
    Untuk setiap pesan yang memerlukan konteks:
    - Tambahkan satu baris penjelasan *tepat di atas* pesan asli.
    - Baris penjelasan ini HARUS dimulai dengan prefix \'[Konteks]: \` (dengan spasi setelah titik dua).
    - Penjelasan harus dalam Bahasa Indonesia.
    - JANGAN mengubah teks pesan obrolan asli sama sekali.
    
    Contoh:
    Jika sebuah pesan adalah "pengen sih main tapi agak males euy" dan konteks sebelumnya tidak jelas atau hilang, Anda bisa menambahkan:
    [Konteks]: Menanggapi ajakan bermain sebelumnya.
    pengen sih main tapi agak males euy
    
    Ingat:
    - Tambahkan konteks hanya jika benar-benar diperlukan untuk meningkatkan pemahaman.
    - Asumsikan obrolan ini terjadi antar teman di Discord.
    - Seluruh konteks yang ditambahkan harus dalam Bahasa Indonesia.
    
    Riwayat obrolan:\n\n${formattedHistory}`;

    console.log(`[Roast Me] Getting history context from user ${author.tag}...`)

    try {
        message.reply("Tunggu bentar, ya.")
    } catch (error) {
        console.error(`[ERROR] Failed to send message to user ${author.tag}: ${error}`);
        return;
    }

    const contextAnalysis = await AI.models.generateContent({
        model,
        contents: getHistoryContextPrompt
    });

    if (!contextAnalysis.text) {
        try {
            console.warn(`[WARN] Failed to generate context for roast`);
            message.reply(`Hi, <@${authorId}>.\nSorry, I couldn't analyze your chat history. Try again later!`);
            return;
        } catch (error) {
            console.error(`[ERROR] Failed to send message to user ${author.tag}: ${error}`);
            return;
        }
    }

    const roastPrompt = `Anda adalah AI yang ahli dalam membuat roasting (sindiran tajam) yang cerdas, lucu, dan mengalir secara alami, berdasarkan HANYA pada riwayat obrolan yang diberikan.
    Tugas Anda adalah membuat roasting untuk pengguna dengan username "${author.username}".

    Gunakan SECARA EKSKLUSIF informasi dari riwayat obrolan (chat history) yang sudah diberi konteks berikut ini. JANGAN PERNAH menambahkan informasi, nama, atau detail apa pun yang tidak ada secara eksplisit dalam teks di bawah ini:
    --- START HISTORY ---
    ${contextAnalysis.text}
    --- END HISTORY ---

    Analisis secara cermat pesan-pesan dari "${author.username}" dan konteks yang menyertainya. Fokus pada perilaku, perkataan, kontradiksi, atau momen lucu/aneh yang *benar-benar terlihat* dalam riwayat chat tersebut untuk menemukan poin-poin yang bisa dijadikan bahan roasting.

    Gaya Roasting:
    - Harus cerdas (witty), pintar (clever), sarkastik, dan menusuk (biting), namun tetap terasa mengalir alami.
    - Hindari lelucon yang terasa dipaksakan. Lebih baik fokus pada observasi tajam terhadap apa yang pengguna katakan/lakukan di chat.
    - Gunakan Bahasa Indonesia yang natural dan sesuai dengan gaya chat/internet.
    - Sapa pengguna secara langsung menggunakan "kamu".
    - Jangan terlalu bahas interaksi dengan bot lain seperti Mudae, kecuali jika itu sangat relevan dengan perilaku pengguna yang diobservasi dari chat.

    Format Output:
    - Hasil roasting HARUS berupa satu blok teks atau paragraf yang koheren dan menyatu. JANGAN gunakan bullet points atau daftar.
    - Rangkai beberapa poin observasi/sindiran secara mulus dengan transisi yang baik dalam satu paragraf tersebut.
    - Jangan terlalu panjang, cukup beberapa kalimat yang padat dan mengena.
    - Jangan tambahkan tanda kutip (") pada awal dan akhir kalimat output.

    Contoh Output yang Diinginkan (hanya sebagai referensi GAYA, FORMAT, dan ALUR, JANGAN tiru isi spesifiknya atau nama-nama di dalamnya jika tidak ada di history):
    Antara jadi budak bot Discord atau jadi budak cinta karakter 2D, kayaknya kamu bingung milihnya, ya? Dari mulai memperkenalkan diri dengan polosnya Adin, sampai ngutuk "bacot anjing," kamu ini paket komplit antara lugu dan edgelord, tapi kayaknya lebih banyak edgelord-nya deh, apalagi abis cerai sama seabrek karakter, jangan-jangan kamu nikah sama mereka biar bisa nyakitin mereka ya? Jangan lupa, kalo aim masih "okei 😔💔", mending jangan nyampah tag ###icikiwir deh, kasian yang liat!

    Sekarang, buatkan roasting untuk "${author.username}" berdasarkan HANYA riwayat obrolan yang diberikan, pastikan terasa alami, tidak mengarang detail, dan tidak diawali/diakhiri dengan tanda kutip.`;

    console.log(`[Roast Me] Generating roast for ${author.tag}...`);

    const roast = await AI.models.generateContent({
        model,
        contents: roastPrompt
    });

    if (!roast.text) {
        try {
            console.warn(`[WARN] Failed to generate roast for ${author.tag}`)
            message.reply(`Hi, <@${authorId}>.\nSorry, I couldn't come up with a roast right now. Try again later!`)
            return;
        } catch (error) {
            console.error(`[ERROR] Failed to send message to user ${author.tag}: ${error}`)
            return;
        }
    }

    try {
        message.reply({
            content: roast.text,
            allowedMentions: {repliedUser: true}
        })
        return;
    } catch (error) {
        console.error(`[ERROR] Failed to send message to user ${author.tag}: ${error}`)
        return;
    }

}