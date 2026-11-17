import { Router } from 'express';
import { AgentController } from './agent.controller';
import { authenticateAgent } from './agent.middleware';
import { validate } from '../../middleware/validate';
import { agentEnrollSchema, agentMetricsSchema } from './agent.schema';

const router = Router();

// Public agent enrollment endpoint
router.post('/enroll', validate(agentEnrollSchema), AgentController.enroll);

// Authenticated agent endpoints
router.post('/heartbeat', authenticateAgent, AgentController.heartbeat);
router.post('/metrics', authenticateAgent, validate(agentMetricsSchema), AgentController.metrics);

export const agentRoutes = router;
