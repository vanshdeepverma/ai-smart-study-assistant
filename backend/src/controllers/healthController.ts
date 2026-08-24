import { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse';

export class HealthController {
  public static check = (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'API is running',
      timestamp: new Date().toISOString()
    });
  };

  public static echo = (req: Request, res: Response) => {
    const { message } = req.body;
    res.status(200).json(ApiResponse.success({ echoedMessage: message }, "Echo successful"));
  };
}
