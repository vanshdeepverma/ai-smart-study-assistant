import { z } from 'zod';

// For demonstrating the validation middleware
export const echoSchema = z.object({
  body: z.object({
    message: z.string().min(3, "Message must be at least 3 characters long"),
  }),
});
