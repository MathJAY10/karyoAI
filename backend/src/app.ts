import dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
// Removed dynamic sitemap/robots serving; now served statically from frontend

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
const allowedOrigins = [
  'https://karyoai.com',
  'https://www.karyoai.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like curl or Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Increase body size limits to support base64 logos in offer letters
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/api/health', (req: Request, res: Response) => res.json({
  status: 'ok server is running'
}));

// Route imports with error handling
try {
  // Import routes
  const userRoutes = require('./routes/user').default;
  
  const adminRoutes = require('./routes/admin').default;
  
  const premiumRoutes = require('./routes/premium').default;
  
  const razorpayRoutes = require('./routes/razorpay').default;
  
  const aiRoutes = require('./routes/excel/ai').default;
  const aiFormulaRoutes = require('./routes/excel/aiFormula').default;
  const chatRoutes = require('./routes/excel/chat').default;
  const errorTrendRoutes = require('./routes/excel/errorTrend').default;
  const captionRewriterRoutes = require('./routes/socialpro/captionRewriter').default;
  const aiworkmateChatRoutes = require('./routes/aiworkmate/aiworkmatechat').default;
  const aiworkmatePromptRoutes = require('./routes/aiworkmate/prompt').default;
  
  const pdfBrainRoutes = require('./routes/pdf/pdfBrainRoutes').default;
  const pdfChatAgentRoutes = require('./routes/pdf/pdfChatAgentRoutes').default;
  const pdfChartRoutes = require('./routes/pdf/pdfChartRoutes').default;
  const smartDataExtractorRoutes = require('./routes/pdf/smartDataExtractor').default;
  const offerLetterRoutes = require('./routes/smartdocs/offerletter').default;
  const smartInvoiceRoutes = require('./routes/smartdocs/smartinvoice').default;
  const pdfConverterProRoutes = require('./routes/pdf/pdfConverterPro').default;
  const bulkmailerExcelEngineRoutes = require('./routes/bulkmailer/excelEngine').default;
  const mailmergeRoutes = require('./routes/bulkmailer/mailmerge').default;
  const smartTemplatesRoutes = require('./routes/bulkmailer/smartTemplates').default;
  // Critical: Import mailcraft routes with detailed logging
  const mailcraftRoutes = require('./routes/mailcraft/emailwizard').default;
  console.log('Mailcraft routes imported successfully:', typeof mailcraftRoutes);
  
  const subjectLineOptimizerRoutes = require('./routes/mailcraft/subjectlineoptimizer').default;
  console.log('Subject line optimizer routes imported successfully:', typeof subjectLineOptimizerRoutes);
  
  const tonePolisherRoutes = require('./routes/mailcraft/tonepolisher').default;
  console.log('Tone polisher routes imported successfully:', typeof tonePolisherRoutes);
  
  // Import socialpro routes
  const captionProRoutes = require('./routes/socialpro/captionPro').default;
  console.log('CaptionPro routes imported successfully:', typeof captionProRoutes);
  
  const hashtagStrategistRoutes = require('./routes/socialpro/hashtagStrategist').default;
  console.log('Hashtag Strategist routes imported successfully:', typeof hashtagStrategistRoutes);
  const adCaptionRoutes = require('./routes/socialpro/adCaption').default;
  console.log('Ad Caption routes imported successfully:', typeof adCaptionRoutes);
  
  // Register routes
  app.use('/api/user', userRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/premium', premiumRoutes);
  app.use('/api/razorpay', razorpayRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/ai/formula', aiFormulaRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/error-trend', errorTrendRoutes);
  app.use('/api/aiworkmate/chat', aiworkmateChatRoutes);
  app.use('/api/aiworkmate/prompt', aiworkmatePromptRoutes);
  app.use('/api/pdf/brain', pdfBrainRoutes);
  app.use('/api/pdf/chatagent', pdfChatAgentRoutes);
  app.use('/api/pdf/chart', pdfChartRoutes);
  app.use('/api/pdf/smartdata', smartDataExtractorRoutes);
  app.use('/api/pdf/convert', pdfConverterProRoutes);
  app.use('/api/bulkmailer/excel-engine', bulkmailerExcelEngineRoutes);
  app.use ('/api/bulkmailer/mailmerge', mailmergeRoutes);
  app.use('/api/bulkmailer/smart-templates', smartTemplatesRoutes);
  app.use('/api/smartdocs/offer-letters', offerLetterRoutes);
  app.use('/api/smartdocs/smart-invoices', smartInvoiceRoutes);
  
  app.use('/api/mailcraft/emailwizard', mailcraftRoutes);
  console.log('Mailcraft routes mounted successfully!');
  
  app.use('/api/mailcraft/subjectlineoptimizer', subjectLineOptimizerRoutes);
  console.log('Subject line optimizer routes mounted successfully!');
  
  app.use('/api/mailcraft/tonepolisher', tonePolisherRoutes);
  console.log('Tone polisher routes mounted successfully!');
  
  // Mount socialpro routes
  app.use('/api/socialpro/captionpro', captionProRoutes);
  console.log('CaptionPro routes mounted successfully!');
  
  app.use('/api/socialpro/hashtagstrategist', hashtagStrategistRoutes);
  console.log('Hashtag Strategist routes mounted successfully!');
  app.use('/api/socialpro/adcaption', adCaptionRoutes);
  console.log('Ad Caption routes mounted successfully!');
  app.use('/api/socialpro/captionrewriter', captionRewriterRoutes);
  console.log('Caption Rewriter routes mounted successfully!');
  
} catch (error) {
  console.error('❌ ERROR IMPORTING ROUTES:', error);
  if (error instanceof Error) {
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
  } else {
    console.error('Error details:', error);
  }
}

// Add a catch-all route for debugging 404s
app.use('/api/mailcraft/emailwizard/*', (req: Request, res: Response) => {
  res.status(404).json({ 
    error: 'Route not found',
    method: req.method,
    url: req.originalUrl,
    availableRoutes: [
      'GET /api/mailcraft/emailwizard/chat/:chat_id',
      'POST /api/mailcraft/emailwizard/chat/send'
    ]
  });
});

// List all registered routes for debugging
app.get('/api/debug/routes', (req: Request, res: Response) => {
  const routes: any[] = [];
  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler: any) => {
        if (handler.route) {
          routes.push({
            path: middleware.regexp.source.replace('\\/?(?=\\/|$)', '') + handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  res.json({ routes });
});

// Note: robots.txt and sitemap.xml are served by the frontend at the root domain


// FIXED: Single error handler (removed duplicate)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Global error handler caught:', err);
  console.error('Error message:', err.message);
  console.error('Error stack:', err.stack);
  res.status(500).json({ 
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler for all other routes
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ 
    error: 'Route not found',
    method: req.method,
    url: req.originalUrl
  });
});

// Test LLM endpoint (for debugging)
import { testLLMConnection } from './controllers/testLLM';
app.get('/api/test-llm', testLLMConnection);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
  
});