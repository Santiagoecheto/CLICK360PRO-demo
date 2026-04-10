import formidable from "formidable";
import fs from "fs";
import admin from "firebase-admin";

// 🔥 Desactivar bodyParser de Vercel
export const config = {
    api: {
        bodyParser: false,
    },
};

// 🔐 Inicializar Firebase Admin SOLO una vez
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FB_PROJECT_ID,
            clientEmail: process.env.FB_CLIENT_EMAIL,
            privateKey: process.env.FB_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
        storageBucket: process.env.FB_STORAGE_BUCKET,
    });
}

const bucket = admin.storage().bucket();

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Método no permitido" });
    }

    try {
        const form = formidable({ multiples: false });

        form.parse(req, async (err, fields, files) => {
            if (err) {
                console.error("Error parseando form:", err);
                return res.status(500).json({ error: "Error procesando archivo" });
            }

            const archivo = files.file;

            if (!archivo) {
                return res.status(400).json({ error: "No se envió archivo" });
            }

            const filePath = archivo.filepath;
            const fileName = `imagenes/${Date.now()}_${archivo.originalFilename}`;

            // 🔥 Subir a Firebase Storage
            await bucket.upload(filePath, {
                destination: fileName,
                metadata: {
                    contentType: archivo.mimetype,
                },
            });

            // 🔥 Obtener URL pública
            const file = bucket.file(fileName);

            await file.makePublic();

            const url = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

            // 🔥 Limpiar archivo temporal
            fs.unlinkSync(filePath);

            return res.status(200).json({
                ok: true,
                url: url,
            });
        });

    } catch (error) {
        console.error("Error en backend:", error);
        return res.status(500).json({ error: "Error interno" });
    }
}
