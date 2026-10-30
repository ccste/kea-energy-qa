export const FAQ_TOPICS = [
  'About Sparky',
  'Accuracy and limits',
  'Bills, warnings and plans',
  'Privacy and support',
] as const

export type FaqTopic = (typeof FAQ_TOPICS)[number]

export interface FaqItem {
  topic: FaqTopic
  question: string
  answer: string
  note?: string
}

// Fixed content expectations captured from the current page source and approved design on 31 October 2026.
// These fixtures are independent of the application at runtime and follow the rendered group order.
export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    topic: 'About Sparky',
    question: 'What is Sparky AI?',
    answer: 'Sparky is Kea Energy’s digital AI assistant that helps you understand your electricity usage, bills and plan options. It turns complex energy information into clear explanations, provides early warnings about possible high bills and connects you with human support when needed.',
  },
  {
    topic: 'About Sparky',
    question: 'What can Sparky help me with?',
    answer: 'Sparky can explain changes in your electricity bill, warn you when your projected bill is higher than expected, compare Kea plans using your usage pattern and answer general questions about your energy account. It can also connect you with the Kea support team when a question requires human assistance.',
  },
  {
    topic: 'About Sparky',
    question: 'How does Sparky work?',
    answer: 'Sparky understands your question and requests information from approved accounts, usage and pricing services. These services perform important calculations, while Sparky explains the results in straightforward language. Sparky is not allowed to create its own bill amounts, projections or savings figures.',
  },
  {
    topic: 'About Sparky',
    question: 'What information does Sparky use?',
    answer: 'Depending on your question, Sparky may use your electricity usage, billing history, current plan, alert preferences and information you choose to upload. It only uses the information needed to answer your request. The current prototype uses synthetic demonstration data rather than real customer accounts.',
  },
  {
    topic: 'Accuracy and limits',
    question: 'Where do Sparky’s numbers come from?',
    answer: 'From your own meter readings and account records. Bill amounts, projections and plan comparisons are worked out by Kea’s own systems using set pricing rules, and Sparky explains the result. Each answer lists what Sparky looked up, so you can see what it read before it replied.',
    note: 'Projections and comparisons are estimates. Your issued bill is the record of what you owe.',
  },
  {
    topic: 'Accuracy and limits',
    question: 'Can Sparky make mistakes?',
    answer: 'Yes. Like any AI assistant, Sparky can misread a question or give an incomplete answer, so please don’t treat its replies as financial advice or as a final decision on your account. It is built to say when it isn’t sure rather than guess. If an answer looks wrong, or you would like it checked, ask to talk to a human and our team will look into it.',
  },
  {
    topic: 'Bills, warnings and plans',
    question: 'How does the Bill Explainer work?',
    answer: 'The Bill Explainer reads the information in your electricity bill and compares it with available usage and pricing data. It identifies the charges, days and time periods that contributed most to the total, then explains them in plain language. It will not claim that a particular appliance caused an increase unless supporting data is available.',
  },
  {
    topic: 'Bills, warnings and plans',
    question: 'What can I upload to the Bill Explainer?',
    answer: 'You can upload an electricity bill as a PDF, JPG or PNG file, including a clear photo or screenshot. Make sure the full bill is readable and avoid uploading unrelated documents or information that is not needed for the explanation.',
  },
  {
    topic: 'Bills, warnings and plans',
    question: 'What is a bill-shock warning?',
    answer: 'A bill-shock warning is an early notification that your projected bill has crossed your selected dollar threshold or is significantly higher than your normal pattern. It gives you an opportunity to review what changed and take action before the billing period ends.',
  },
  {
    topic: 'Bills, warnings and plans',
    question: 'How often will Kea send warnings?',
    answer: 'Kea sends an initial warning when your projected bill crosses the threshold you selected. It will not repeatedly send the same alert, but it may send another warning if the projection increases significantly. You can change your threshold, notification channel or opt out of warnings at any time.',
  },
  {
    topic: 'Bills, warnings and plans',
    question: 'Is my projected bill the same as my final bill?',
    answer: 'No. A projected bill is an estimate based on your usage so far, expected usage for the rest of the billing period and your current pricing information. Your final bill may differ if your usage changes, additional meter information becomes available or adjustments are applied.',
  },
  {
    topic: 'Bills, warnings and plans',
    question: 'How does Kea compare plans?',
    answer: 'Kea applies each available Kea plan to your usage pattern and calculates the estimated cost, including usage rates, daily charges, free-power periods, monthly credits, commitment length and possible exit fees. It may recommend staying on your current plan if changing would not provide a meaningful benefit.',
    note: 'Kea does not compare every electricity provider in New Zealand, only the big four energy providers.',
  },
  {
    topic: 'Privacy and support',
    question: 'How does Kea protect my information?',
    answer: 'Kea uses authentication, encryption and access controls to protect customer information. The system is designed to use only the data needed for each request and prevent customers from accessing another person’s account. Sensitive account details are not disclosed until the customer’s identity has been verified.',
  },
  {
    topic: 'Privacy and support',
    question: 'Are my conversations with Sparky stored?',
    answer: 'Conversations may be stored securely for a limited period to provide the service, maintain an audit record, investigate problems and improve safety and quality. Access is restricted to authorised systems and staff. Kea does not use your private account conversations to train a publicly available AI model.',
  },
  {
    topic: 'Privacy and support',
    question: 'Can I speak to a real person?',
    answer: 'Yes. You can request human assistance at any time. Sparky will also offer a handoff when it cannot answer safely, when you dispute important information or when your situation requires additional support. Where possible, relevant conversation context will be transferred so you do not have to repeat everything.',
  },
]

export const FAQ_SEARCH_CASES = [
  {
    query: 'warning',
    questions: [
      'What is Sparky AI?',
      'What is a bill-shock warning?',
      'How often will Kea send warnings?',
    ],
    counts: [3, 1, 0, 2, 0],
  },
  {
    query: 'pdf',
    questions: ['What can I upload to the Bill Explainer?'],
    counts: [1, 0, 0, 1, 0],
  },
  {
    query: 'big four',
    questions: ['How does Kea compare plans?'],
    counts: [1, 0, 0, 1, 0],
  },
  {
    query: '  human  ',
    questions: [
      'What is Sparky AI?',
      'What can Sparky help me with?',
      'Can Sparky make mistakes?',
      'Can I speak to a real person?',
    ],
    counts: [4, 2, 1, 0, 1],
  },
] as const satisfies readonly { query: string; questions: readonly string[]; counts: readonly number[] }[]
