import { app } from "./app.js";
import { config } from "./core/config.js";

app.listen(config.port, () => {
  console.log(`Jurisynth API listening on http://localhost:${config.port}`);
});
