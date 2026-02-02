import prisma from '../lib/prisma';

const templates = [
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

async function main() {
  for (const tpl of templates) {
    await prisma.mailTemplate.create({
      data: tpl,
    });
  }
  console.log('Seeded 20 public mail templates');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());