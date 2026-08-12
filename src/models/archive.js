const { mongoose } = require("../config/db");
const { Schema } = require("mongoose");

const archiveSchema = new Schema(
  {
    imagen: {
      type: String,
      required: [true, 'La imagen es obligatoria'],
    },
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: [true, 'El post asociado es obligatorio'],
    },
    data: {
      type: Buffer,
      select: false,
    },
    mimeType: {
      type: String,
      select: false,
    },
  },
  { collection: "archives" }
);

archiveSchema.set("toJSON", {
  transform: (_, ret) => {
    delete ret.__v;
    delete ret.data;
    delete ret.mimeType;
  },
});

const Archive = mongoose.model("Archive", archiveSchema);
module.exports = Archive;
