import { MedusaService } from "@medusajs/framework/utils";
import Subscriber from "./models/subscriber";

class WaitlistModuleService extends MedusaService({ Subscriber }) {}

export default WaitlistModuleService;
