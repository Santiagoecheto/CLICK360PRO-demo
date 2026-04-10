export default async function handler(req, res) {
    // 🔒 Solo permitir POST
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Método no permitido" });
    }

    try {
        // 🔥 Acá después vamos a procesar la imagen
        return res.status(200).json({ ok: true, mensaje: "API funcionando" });

    } catch (error) {
        console.error("Error en backend:", error);
        return res.status(500).json({ error: "Error interno" });
    }
}
