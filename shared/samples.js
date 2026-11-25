// Demo cases. Each one hides several contradictions, a few facts that agree, and some gaps,
// so the analysis has something real to find. All names, numbers and companies are fictional.

export const SAMPLE_CASES = [
  {
    id: 'motor-claim',
    icon: 'car',
    ref: 'Claim MC-26-4471',
    title: 'Rear-end collision claim',
    blurb: 'The policyholder, the other driver, a tea-stall owner and the garage describe the same collision.',
    context:
      'Motor own-damage claim MC-26-4471, filed by the policyholder after a rear-end collision at Botanical Garden junction, Hyderabad, on 14 October 2026. The garage estimate is ₹1,86,500. Decide whether the claim can be settled or needs investigation.',
    exhibits: [
      {
        label: 'Claimant statement, Rohan Mehta (policyholder)',
        kind: 'statement',
        text: 'On 14 October, around 9:15 PM, I was driving home from my office in Gachibowli towards Kondapur in my Hyundai Creta (TS09 EX 4821). It was raining heavily and the road was wet. I had stopped at the red signal at Botanical Garden junction when a white Maruti Swift hit my car from behind. The impact pushed my car forward by a few feet. My rear bumper and boot were badly damaged. I was alone in the car. The other driver got out and admitted he was looking at his phone. I called a tow truck and my car reached Sri Sai Motors at about 10:30 PM. This car has never been in an accident before.',
      },
      {
        label: 'Other driver, Arvind Rao (Maruti Swift)',
        kind: 'statement',
        text: 'I was behind the Creta at about 9 PM near Botanical Garden junction. The signal was green and traffic was moving. The Creta braked suddenly for no reason I could see. I braked too but touched its rear bumper at low speed. The road was dry; it had not rained that evening. There were two people in the Creta, the driver and a woman in the front passenger seat. My phone was in my bag and I was not using it. Only my front number plate and left headlight were damaged.',
      },
      {
        label: 'Witness, Salma Begum (tea stall at the junction)',
        kind: 'witness',
        text: "I run the tea stall at the Botanical Garden signal. A little after 9 o'clock I heard a bang and looked up. The light on that side had just turned green and the big car in front had stopped suddenly. The small white car hit it from behind, not very hard. A lady got out of the big car's passenger side and walked towards the bus stop before anyone came. There was no rain that day, but the road near my stall is always wet because the water tanker fills up there in the evening.",
      },
      {
        label: 'Garage job card, Sri Sai Motors SSM-2318',
        kind: 'record',
        text: 'Job card SSM-2318. Vehicle: Hyundai Creta TS09EX4821. Received: 14-10-2026 20:40, towed from Botanical Garden junction. Odometer: 48,212 km. Damage at intake: rear bumper cracked, boot lid dented, rear left tail lamp broken. Also noted: front left headlamp assembly and front bumper damaged; dust and rust on the broken edges suggest older damage. Estimate: rear repairs ₹1,48,500; front left headlamp and bumper ₹38,000. Total ₹1,86,500.',
      },
    ],
  },
  {
    id: 'warehouse-injury',
    icon: 'hardhat',
    ref: 'Report WI-1103',
    title: 'Warehouse injury report',
    blurb: "An injured picker, the forklift operator, the supervisor and the building's own logs tell different stories.",
    context:
      'Workplace injury report WI-1103 from the Medchal fulfilment centre, 3 November 2026. An employee reports an ankle injury in Zone B. Establish what happened and whether safety procedures were followed before the compensation decision.',
    exhibits: [
      {
        label: 'Employee statement, Priya Nair (picker)',
        kind: 'statement',
        text: 'On 3 November I was picking orders in Aisle 7 of Zone B at around 2:30 PM. A forklift reversed into the aisle without any horn or reversing beep and knocked a pallet of cartons off the rack. The pallet fell onto my right foot. I was wearing my safety shoes as always. I completed the forklift-zone safety training in September. The forklift driver was Imran. I reported the injury to my supervisor straight away.',
      },
      {
        label: 'Forklift operator, Imran Shaikh',
        kind: 'statement',
        text: 'At around 2:50 PM I was reversing forklift FL-02 out of Aisle 4 in Zone A. The reverse alarm was working, as it always does. I did not enter Aisle 7 that afternoon. A few minutes later I heard someone shout from the next zone and went over to help. I did not hit any rack or pallet. The cartons in Aisle 7 had been stacked high and loose since the morning shift.',
      },
      {
        label: "Supervisor's incident report, Kavitha Reddy",
        kind: 'report',
        text: "Incident logged at 15:05. Location: Zone B, Aisle 7. Employee P. Nair reported a right ankle injury from a falling carton (a single carton, not a pallet). Employee was wearing sports shoes, not safety shoes; PPE non-compliance noted. Forklift FL-02's reverse alarm was reported faulty on 1 November (maintenance ticket MT-882, repair pending), but FL-02 remained in service. First aid given; employee sent to the clinic at 15:20.",
      },
      {
        label: 'Badge, telematics and training records',
        kind: 'record',
        text: "Badge #5520 (P. Nair): Zone B entry 14:12; Zone B exit 14:41; Break room entry 14:43; Zone B entry 14:58. Forklift FL-02 telematics: ignition on 13:30 to 16:00; reverse events at 14:47 and 14:52, location Aisle 4/5 boundary, Zone A; no movement logged in Zone B between 14:00 and 15:30. Training records: P. Nair, 'Forklift Zone Awareness': not completed (scheduled 20 Nov 2026).",
      },
    ],
  },
  {
    id: 'checkout-outage',
    icon: 'server',
    ref: 'Incident INC-1106',
    title: 'Checkout outage postmortem',
    blurb: "The on-call engineer's recap doesn't match the deploy log, the alerts, the vendor or customer support.",
    context:
      'Postmortem for the checkout outage on 6 November 2026. Customers saw payment failures for about 40 minutes. Establish an accurate timeline and root cause before the incident review.',
    exhibits: [
      {
        label: "On-call engineer's Slack recap, Dev Malhotra",
        kind: 'message',
        text: "Quick recap of today's checkout incident. Errors started at ~14:20 IST and I was paged at 14:22. We deployed payments-service v2.14 at 14:35, after the errors had already started, so the deploy can't be the cause. The root cause was PayFlow, our payment gateway, having an outage on their side. I rolled back v2.14 at 14:52 anyway as a precaution and errors cleared by 14:55. No customer money was affected.",
      },
      {
        label: 'Deploy log, payments-service',
        kind: 'record',
        text: "2026-11-06 14:12:08 IST deploy started: payments-service v2.14.0 (commit 8f3c21a, 'switch PayFlow client to async retries'). 14:14:30 canary 10%, health check passed. 14:18:52 rollout 100% complete, status SUCCESS. 14:51:40 rollback started to v2.13.4. 14:54:10 rollback complete, status SUCCESS.",
      },
      {
        label: 'Monitoring alerts',
        kind: 'record',
        text: '14:19:40 FIRING checkout-api 5xx rate above 5% (peak 31% at 14:31). 14:21:10 FIRING payments-service p99 latency above 3s. 14:21:55 page sent to on-call (Dev Malhotra). 14:29:03 page acknowledged. 14:56:30 RESOLVED checkout-api 5xx rate. 14:57:05 RESOLVED payments-service p99 latency.',
      },
      {
        label: 'PayFlow status page (vendor)',
        kind: 'document',
        text: '6 November 2026: all systems operational from 00:00 to 16:00 IST. Incident: degraded performance on the UPI collect API from 16:05 to 16:20 IST. Resolved.',
      },
      {
        label: 'Customer support summary',
        kind: 'report',
        text: 'The first tickets about failed payments arrived at 14:16 IST. We received 340 tickets by 15:10. About 60 customers say they were charged twice for a single order; refunds are being processed manually.',
      },
    ],
  },
];
