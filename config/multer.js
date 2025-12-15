    import multer from "multer";

    const storage = multer.memoryStorage(); // IMPORTANT
    const upload = multer({ storage, limits: { fieldSize: 25 * 1024 * 1024 } });

    export default upload;
