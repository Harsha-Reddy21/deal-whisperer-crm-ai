Follow the sample record:

1.
lead_data:
{
  "id": "lead_123",
  "name": "Alice Johnson",
  "email": "alice@greentech.io",
  "company": "GreenTech Innovations",
  "phone": "+1-555-123-4567",
  "status": "Qualified",
  "lead_source": "Webinar",
  "score": 78,
  "created_at": "2025-05-15",
  "owner": "Michael Scott",
  "notes": "Very interested in our sustainability tools. Wants to see a demo."
}

activities:

[
  {
    "type": "Email",
    "date": "2025-05-16",
    "content": "Sent welcome email with product overview and demo request link."
  },
  {
    "type": "Call",
    "date": "2025-05-18",
    "content": "Discussed use case. Alice mentioned her team is evaluating eco-certification tools."
  },
  {
    "type": "Meeting",
    "date": "2025-05-20",
    "content": "Demo scheduled. Alice and her CTO will attend."
  }
]


3. compose the embedding text:
Lead: Alice Johnson
Company: GreenTech Innovations
Email: alice@greentech.io
Phone: +1-555-123-4567
Lead Source: Webinar
Status: Qualified
Score: 78
Owner: Michael Scott
Created At: May 15, 2025
Notes: Very interested in our sustainability tools. Wants to see a demo.

Activities:
- [2025-05-16] Email: Sent welcome email with product overview and demo request link.
- [2025-05-18] Call: Discussed use case. Alice mentioned her team is evaluating eco-certification tools.
- [2025-05-20] Meeting: Demo scheduled. Alice and her CTO will attend.


4. embedd the text:
import openai

response = openai.embeddings.create(
    model="text-embedding-3-small",
    input=lead_text  # from above
)
embedding_vector = response.data[0].embedding


4. add to database