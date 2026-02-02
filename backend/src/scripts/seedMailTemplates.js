"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var prisma_1 = require("../lib/prisma");
var templates = [
    {
        title: 'Welcome Email',
        subject: 'Welcome to Our Service!',
        description: 'A warm welcome for new subscribers with a clear next step.',
        body: 'Hi {{name}},\n\nWelcome to our service! We are excited to have you on board. If you have any questions, feel free to reach out.\n\nBest regards,\nThe Team',
        category: 'Marketing',
        isPublic: true,
    },
    {
        title: 'Sales Follow-up',
        subject: 'Let’s Book a Time',
        description: 'Polite follow-up with value and a simple CTA to book time.',
        body: 'Hi {{name}},\n\nJust checking in to see if you had a chance to review our proposal. Let me know if you’d like to book a time to discuss further.\n\nBest,\nSales Team',
        category: 'Business',
        isPublic: true,
    },
    {
        title: 'Win-back Email',
        subject: 'We Miss You!',
        description: 'Re-engage inactive users with a concise incentive.',
        body: 'Hi {{name}},\n\nWe noticed you haven’t been active lately. Here’s a special offer just for you to come back!\n\nCheers,\nCustomer Success',
        category: 'Productivity',
        isPublic: true,
    },
    {
        title: 'Password Reset',
        subject: 'Reset Your Password',
        description: 'Instructions for resetting a user’s password.',
        body: 'Hi {{name}},\n\nClick the link below to reset your password:\n{{reset_link}}\n\nIf you did not request this, please ignore this email.\n\nThanks,\nSupport Team',
        category: 'Security',
        isPublic: true,
    },
    {
        title: 'Account Activation',
        subject: 'Activate Your Account',
        description: 'Prompt users to activate their account.',
        body: 'Hi {{name}},\n\nPlease activate your account by clicking the link below:\n{{activation_link}}\n\nWelcome aboard!\n\nBest,\nSupport Team',
        category: 'Security',
        isPublic: true,
    },
    {
        title: 'Feedback Request',
        subject: 'We Value Your Feedback',
        description: 'Ask users for feedback after a purchase or interaction.',
        body: 'Hi {{name}},\n\nWe’d love to hear your thoughts on your recent experience. Please reply to this email or fill out our feedback form.\n\nThank you!\nCustomer Experience',
        category: 'Marketing',
        isPublic: true,
    },
    {
        title: 'Newsletter',
        subject: 'Monthly Updates',
        description: 'Share news, updates, and tips with subscribers.',
        body: 'Hi {{name}},\n\nHere are this month’s updates and tips. Stay tuned for more!\n\nBest,\nThe Team',
        category: 'Marketing',
        isPublic: true,
    },
    {
        title: 'Order Confirmation',
        subject: 'Your Order is Confirmed',
        description: 'Confirm a user’s order and provide details.',
        body: 'Hi {{name}},\n\nYour order #{{order_id}} has been confirmed. We’ll notify you when it ships.\n\nThank you for shopping with us!\nSales Team',
        category: 'Business',
        isPublic: true,
    },
    {
        title: 'Shipping Notification',
        subject: 'Your Order Has Shipped',
        description: 'Notify users when their order ships.',
        body: 'Hi {{name}},\n\nYour order #{{order_id}} has shipped. Track your shipment here: {{tracking_link}}\n\nThanks for choosing us!\nSales Team',
        category: 'Business',
        isPublic: true,
    },
    {
        title: 'Appointment Reminder',
        subject: 'Upcoming Appointment Reminder',
        description: 'Remind users of upcoming appointments.',
        body: 'Hi {{name}},\n\nThis is a reminder for your appointment on {{date}} at {{time}}.\n\nSee you soon!\nReception',
        category: 'Productivity',
        isPublic: true,
    },
    {
        title: 'Event Invitation',
        subject: 'You’re Invited!',
        description: 'Invite users to an event.',
        body: 'Hi {{name}},\n\nYou’re invited to our upcoming event: {{event_name}} on {{date}}. RSVP here: {{rsvp_link}}\n\nHope to see you there!\nEvents Team',
        category: 'Marketing',
        isPublic: true,
    },
    {
        title: 'Thank You Email',
        subject: 'Thank You!',
        description: 'Express gratitude after a purchase or meeting.',
        body: 'Hi {{name}},\n\nThank you for your recent purchase/meeting. We appreciate your business!\n\nBest,\nThe Team',
        category: 'Business',
        isPublic: true,
    },
    {
        title: 'Subscription Renewal',
        subject: 'Your Subscription is Renewing',
        description: 'Notify users of upcoming subscription renewal.',
        body: 'Hi {{name}},\n\nYour subscription will renew on {{renewal_date}}. If you have questions, contact us.\n\nThanks for being a valued member!\nSupport Team',
        category: 'Productivity',
        isPublic: true,
    },
    {
        title: 'Cancellation Confirmation',
        subject: 'Your Subscription is Cancelled',
        description: 'Confirm cancellation and offer reactivation.',
        body: 'Hi {{name}},\n\nYour subscription has been cancelled. If you change your mind, you can reactivate anytime.\n\nBest,\nSupport Team',
        category: 'Productivity',
        isPublic: true,
    },
    {
        title: 'Referral Invitation',
        subject: 'Invite a Friend!',
        description: 'Encourage users to refer friends.',
        body: 'Hi {{name}},\n\nInvite your friends to join us and earn rewards! Share this link: {{referral_link}}\n\nThanks for spreading the word!\nMarketing Team',
        category: 'Marketing',
        isPublic: true,
    },
    {
        title: 'Survey Invitation',
        subject: 'We Want Your Opinion',
        description: 'Invite users to participate in a survey.',
        body: 'Hi {{name}},\n\nWe value your opinion! Please take our survey: {{survey_link}}\n\nThank you!\nResearch Team',
        category: 'Education',
        isPublic: true,
    },
    {
        title: 'Promotion Announcement',
        subject: 'Special Promotion!',
        description: 'Announce a special promotion or sale.',
        body: 'Hi {{name}},\n\nWe’re excited to announce a special promotion: {{promotion_details}}. Don’t miss out!\n\nBest,\nMarketing Team',
        category: 'Marketing',
        isPublic: true,
    },
    {
        title: 'Account Update',
        subject: 'Your Account Has Been Updated',
        description: 'Notify users of account changes.',
        body: 'Hi {{name}},\n\nYour account information has been updated. If you did not request this, contact support.\n\nThanks,\nSupport Team',
        category: 'Security',
        isPublic: true,
    },
    {
        title: 'Support Ticket Response',
        subject: 'Your Support Ticket',
        description: 'Respond to a user’s support ticket.',
        body: 'Hi {{name}},\n\nWe’ve reviewed your support ticket and will get back to you soon.\n\nThank you for your patience!\nSupport Team',
        category: 'Productivity',
        isPublic: true,
    },
    {
        title: 'Birthday Greeting',
        subject: 'Happy Birthday!',
        description: 'Send birthday wishes to users.',
        body: 'Hi {{name}},\n\nHappy Birthday! Wishing you a wonderful year ahead.\n\nBest wishes,\nThe Team',
        category: 'Social Media',
        isPublic: true,
    },
];
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var _i, templates_1, tpl;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _i = 0, templates_1 = templates;
                    _a.label = 1;
                case 1:
                    if (!(_i < templates_1.length)) return [3 /*break*/, 4];
                    tpl = templates_1[_i];
                    return [4 /*yield*/, prisma_1.default.mailTemplate.upsert({
                            where: { title: tpl.title },
                            update: tpl,
                            create: tpl,
                        })];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    console.log('Seeded 20 public mail templates');
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (e) {
    console.error(e);
    process.exit(1);
}).finally(function () { return prisma_1.default.$disconnect(); });
