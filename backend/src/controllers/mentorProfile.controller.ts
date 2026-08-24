import { Request, Response } from 'express';
import { MentorProfileService } from '../services/mentorProfile.service';
import { WeaknessDetectionService } from '../services/weaknessDetection.service';
import { RecommendationService } from '../services/recommendation.service';

export class MentorProfileController {
  /**
   * GET /api/v1/mentor/profile
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
      }

      const profileData = await MentorProfileService.getStudentProfile(userId);
      res.json({
        success: true,
        data: profileData
      });
    } catch (error) {
      console.error('[MentorProfileController] Error getting profile:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve mentor profile' }
      });
    }
  }

  /**
   * PATCH /api/v1/mentor/profile
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
      }

      const { preferredStyle, academicGoal } = req.body;
      const updated = await MentorProfileService.updateStudentProfile(userId, {
        preferredStyle,
        academicGoal
      });

      res.json({
        success: true,
        message: 'Profile preferences updated successfully',
        data: updated
      });
    } catch (error) {
      console.error('[MentorProfileController] Error updating profile:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update profile preferences' }
      });
    }
  }

  /**
   * GET /api/v1/mentor/weaknesses
   */
  static async getWeaknesses(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
      }

      const weaknesses = await WeaknessDetectionService.getUserWeaknesses(userId);
      res.json({
        success: true,
        data: weaknesses
      });
    } catch (error) {
      console.error('[MentorProfileController] Error getting weaknesses:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve topic weaknesses' }
      });
    }
  }

  /**
   * GET /api/v1/mentor/recommendations
   */
  static async getRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
      }

      const recommendations = await RecommendationService.getUserRecommendations(userId);
      res.json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      console.error('[MentorProfileController] Error getting recommendations:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve study recommendations' }
      });
    }
  }

  /**
   * POST /api/v1/mentor/recommendations/:id/dismiss
   */
  static async dismissRecommendation(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
      }

      const id = req.params.id as string;
      const updated = await RecommendationService.dismissRecommendation(userId, id);

      res.json({
        success: true,
        message: 'Recommendation dismissed',
        data: updated
      });
    } catch (error) {
      console.error('[MentorProfileController] Error dismissing recommendation:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to dismiss recommendation' }
      });
    }
  }
}
