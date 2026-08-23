# REQUIRED BACKEND INTEGRATION

Add to your main server:

```ts
import cors from 'cors';
import express from 'express';

app.use(cors());
app.use(express.json());

import { settingsRouter } from './control-plane/api/settings.routes';
import { settingsStreamRouter } from './control-plane/events/settingsStream';

app.use('/settings', settingsRouter);
app.use('/settings', settingsStreamRouter);
