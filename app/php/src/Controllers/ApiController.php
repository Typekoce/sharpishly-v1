<?php

namespace App\Controllers;

class ApiController extends BaseController {

	public function index(){

<?php

require_once 'Api.php';

// Define your Google OAuth 2.0 access token
$accessToken = 'ya29.a0AcM6123...your_google_oauth_token_here...';

$response = Api::getInstance()->save([
    'service'  => 'https://www.googleapis.com/calendar/v3',
    'endpoint' => 'calendars/primary/events',
    'method'   => 'POST',
    'headers'  => [
        'Authorization' => "Bearer {$accessToken}"
    ],
    'data'     => [
        'summary'     => 'Sharpishly Architecture Review',
        'description' => 'Reviewing custom zero-dependency PHP MVC framework updates and pipeline sync.',
        'location'    => 'Manchester, UK',
        'start'       => [
            'dateTime' => '2026-10-28T10:00:00Z',
            'timeZone' => 'Europe/London'
        ],
        'end'         => [
            'dateTime' => '2026-10-28T11:00:00Z',
            'timeZone' => 'Europe/London'
        ],
        'attendees'   => [
            ['email' => 'colleague@example.com']
        ]
    ]
]);

// Handle the response
if ($response['status'] === 200 || $response['status'] === 201) {
    $createdEvent = $response['body'];
    echo "Event successfully created! ID: " . $createdEvent['id'];
} else {
    echo "Failed to create event. Status: {$response['status']}\n";
    print_r($response['body']);
}

	}

}
