import { model } from "@medusajs/framework/utils";

const Subscriber = model.define("waitlist_subscriber", {
  id: model.id().primaryKey(),
  email: model.text().unique(),
  // Which page the signup came from, so a later campaign can tell the v2
  // waitlist apart from a v1 back-in-stock request or the on-hold KeBe Lite's
  // waitlist ("lite"). An address on more than one list has each, comma-separated
  // ("v2,lite"), in the order it joined them.
  source: model.text().default("v2"),
});

export default Subscriber;
