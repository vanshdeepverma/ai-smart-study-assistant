import { prisma } from '../src/utils/db';
import { WeaknessDetectionService } from '../src/services/weaknessDetection.service';
import { RecommendationService } from '../src/services/recommendation.service';

async function runP3ETests() {
  console.log('================================================================');
  console.log('=== RUNNING P3-E WEAKNESS DETECTION & RECOMMENDATION TESTS ===');
  console.log('================================================================');

  // 1. Create Test User
  const testUser = await prisma.user.create({
    data: {
      email: `p3e_test_${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'P3E Test Student'
    }
  });

  console.log(`[SETUP] Created Test User: ${testUser.id}`);

  // 2. Create Test Document
  const doc = await prisma.document.create({
    data: {
      userId: testUser.id,
      filename: 'CSMA_CD_Ethernet_Notes.pdf',
      fileUrl: '/uploads/dummy.pdf',
      status: 'READY'
    }
  });

  // 3. Create Test Quiz & Questions
  const quiz = await prisma.quiz.create({
    data: {
      documentId: doc.id,
      title: 'CSMA/CD Ethernet Quiz',
      difficulty: 'MEDIUM'
    }
  });

  const q1 = await prisma.question.create({
    data: {
      quizId: quiz.id,
      text: 'What does CSMA/CD stand for?',
      options: ['Carrier Sense Multiple Access with Collision Detection', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Carrier Sense Multiple Access with Collision Detection'
    }
  });

  const q2 = await prisma.question.create({
    data: {
      quizId: quiz.id,
      text: 'Which cable media uses CSMA/CD?',
      options: ['Wired Ethernet', 'Wi-Fi 6', 'Bluetooth', 'Satellite'],
      correctAnswer: 'Wired Ethernet'
    }
  });

  // 4. Create Quiz Attempt with 0% score to trigger WEAK mastery
  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: testUser.id,
      quizId: quiz.id,
      score: 0,
      completedAt: new Date()
    }
  });

  await prisma.answer.createMany({
    data: [
      { attemptId: attempt.id, questionId: q1.id, selectedOption: 'Option B', isCorrect: false },
      { attemptId: attempt.id, questionId: q2.id, selectedOption: 'Wi-Fi 6', isCorrect: false }
    ]
  });

  // 5. Run Weakness Detection Processing
  console.log('[TEST 1] Processing Quiz Attempt for Weakness Detection...');
  const weaknessResult = await WeaknessDetectionService.processQuizAttempt(testUser.id, attempt.id);
  console.log('Processed Weakness Record:', weaknessResult);

  if (!weaknessResult || weaknessResult.masteryLevel >= 40) {
    throw new Error(`FAIL: Expected WEAK mastery (<40), got ${weaknessResult?.masteryLevel}`);
  }
  console.log('✅ PASS: Quiz attempt correctly computed WEAK topic mastery!');

  // 6. Fetch Formatted Weaknesses
  console.log('[TEST 2] Fetching User Weaknesses...');
  const weaknesses = await WeaknessDetectionService.getUserWeaknesses(testUser.id);
  console.log('Formatted Weaknesses:', weaknesses);

  if (weaknesses.length === 0 || weaknesses[0].masteryLabel !== 'WEAK') {
    throw new Error(`FAIL: Expected WEAK label in formatted weaknesses list`);
  }
  console.log('✅ PASS: Weakness formatted with evidence summary & WEAK badge!');

  // 7. Verify Recommendation Generation
  console.log('[TEST 3] Fetching User Recommendations...');
  const recs = await RecommendationService.getUserRecommendations(testUser.id);
  console.log('Generated Recommendations:', recs);

  if (recs.length === 0) {
    throw new Error('FAIL: Recommendation engine failed to generate recommendation card for WEAK topic');
  }
  console.log('✅ PASS: Recommendation Engine created targeted study card!');

  // 8. Test Recommendation Dismissal
  console.log('[TEST 4] Testing Recommendation Dismissal...');
  await RecommendationService.dismissRecommendation(testUser.id, recs[0].id);
  const activeRecsAfterDismiss = await RecommendationService.getUserRecommendations(testUser.id);
  
  if (activeRecsAfterDismiss.some(r => r.id === recs[0].id)) {
    throw new Error('FAIL: Recommendation was not dismissed cleanly');
  }
  console.log('✅ PASS: Recommendation dismissal verified!');

  // Cleanup
  await prisma.user.delete({ where: { id: testUser.id } });
  console.log('================================================================');
  console.log('=== ALL P3-E BACKEND UNIT & INTEGRATION TESTS PASSED SUCCESSFULLY ✅ ===');
  console.log('================================================================');
}

runP3ETests().catch(err => {
  console.error('❌ P3-E Backend Test Error:', err);
  process.exit(1);
});
