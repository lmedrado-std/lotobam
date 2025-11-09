# **App Name**: Lotomania Master

## Core Features:

- Automated Bet Generation: Automatically generate Lotomania bets (50 numbers each) based on a range of user-defined criteria such as purely random bets, balanced number ranges, sum targets, hot/cold number prioritization, sequence avoidance, or combinations thereof. AI tool assists user with creating custom criteria by suggesting parameters based on popular strategies. Criteria details are then added to each document saved to Firestore.
- Manual and Batch Game Creation: Enable users to manually create individual games or generate games in batches with tools, providing flexibility in bet creation.
- Data Import: Allow users to upload compiled lists of numbers and statistics (CSV/TXT/JSON) for automated game creation, with functionality to validate the uploads, suggest transformations, and use the provided data in AI for generating more accurate games based on said data, prior to storing games into Firestore
- Bet Export: Enable users to download and export generated bets in various formats (CSV/TXT/JSON/ZIP), and include the set of all generation criteria, for convenient record-keeping and sharing, with the option to zip into file, prior to exporting from Firestore
- Game Template Management: Allow users to save and reuse game templates (combinations of restrictions) for future bet generation, for easy one-click game generation and saved to Firestore
- User History Tracking: Maintain a history of downloads, imports, and generated games per user. This tracking should encompass upload, download, criteria settings, bet outcomes and other parameters, with a well-defined data taxonomy when persisting to Firestore.
- User Authentication and Authorization: User authentication and authorization

## Style Guidelines:

- Primary color: A vibrant, hopeful blue (#3498DB), evocative of a bright sky and the optimism of a lottery.
- Background color: A very light blue (#EBF5FB), providing a clean and calming backdrop that won't distract from the numbers.
- Accent color: A warm orange (#E67E22), drawing attention to calls to action.
- Headline font: 'Playfair', a modern sans-serif, to give titles and important information an elegant feel; body text: 'PT Sans' to maintain good readability for large blocks of text.
- Use clear, intuitive icons for different generation criteria and export options.
- Employ a 10x10 grid layout for number selection, providing an intuitive and visually clear interface.
- Incorporate subtle animations when generating new bets or transitioning between different views, enhancing the user experience.