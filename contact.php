<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('X-Frame-Options: SAMEORIGIN');

const MAX_REQUEST_BYTES = 65536;
const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 5000;
const RATE_LIMIT_SECONDS = 20;

function respond(int $status, bool $success, string $message): never
{
    http_response_code($status);

    echo json_encode(
        [
            'success' => $success,
            'message' => $message
        ],
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
    );

    exit;
}

function stringLength(string $value): int
{
    if (function_exists('mb_strlen')) {
        return mb_strlen($value, 'UTF-8');
    }

    return strlen($value);
}

function normalizeText(string $value): string
{
    $value = str_replace(["\r\n", "\r"], "\n", $value);
    $value = strip_tags($value);

    $cleaned = preg_replace(
        '/[^\P{C}\n\t]/u',
        '',
        $value
    );

    if (is_string($cleaned)) {
        $value = $cleaned;
    }

    return trim($value);
}

function singleLine(string $value): string
{
    $value = normalizeText($value);

    $collapsed = preg_replace('/\s+/u', ' ', $value);

    return trim(
        is_string($collapsed)
            ? $collapsed
            : $value
    );
}

function requestField(array $data, string $key): string
{
    $value = $data[$key] ?? '';

    if (
        !is_string($value) &&
        !is_numeric($value)
    ) {
        return '';
    }

    return normalizeText((string) $value);
}

function truthyValue(mixed $value): bool
{
    if (is_bool($value)) {
        return $value;
    }

    if (is_int($value) || is_float($value)) {
        return (int) $value === 1;
    }

    if (!is_string($value)) {
        return false;
    }

    return in_array(
        strtolower(trim($value)),
        ['1', 'true', 'yes', 'on', 'accepted'],
        true
    );
}

function readRequestData(): array
{
    $contentType = strtolower(
        (string) ($_SERVER['CONTENT_TYPE'] ?? '')
    );

    if (str_contains($contentType, 'application/json')) {
        $rawBody = file_get_contents('php://input');

        if (!is_string($rawBody) || $rawBody === '') {
            return [];
        }

        if (strlen($rawBody) > MAX_REQUEST_BYTES) {
            respond(
                413,
                false,
                'Your request is too large. Please shorten the message and try again.'
            );
        }

        try {
            $decoded = json_decode(
                $rawBody,
                true,
                32,
                JSON_THROW_ON_ERROR
            );
        } catch (JsonException) {
            respond(
                400,
                false,
                'The submitted request could not be read. Please refresh the page and try again.'
            );
        }

        return is_array($decoded)
            ? $decoded
            : [];
    }

    return $_POST;
}

function extractObjectLiteral(
    string $source,
    string $objectName
): string {
    $pattern = '/\b' .
        preg_quote($objectName, '/') .
        '\s*:\s*\{/';

    if (
        preg_match(
            $pattern,
            $source,
            $match,
            PREG_OFFSET_CAPTURE
        ) !== 1
    ) {
        return '';
    }

    $matchText = $match[0][0];
    $matchOffset = $match[0][1];
    $openingBrace = strpos($matchText, '{');

    if ($openingBrace === false) {
        return '';
    }

    $start = $matchOffset + $openingBrace;
    $length = strlen($source);
    $depth = 0;
    $quote = '';
    $escaped = false;

    for ($index = $start; $index < $length; $index++) {
        $character = $source[$index];

        if ($quote !== '') {
            if ($escaped) {
                $escaped = false;
                continue;
            }

            if ($character === '\\') {
                $escaped = true;
                continue;
            }

            if ($character === $quote) {
                $quote = '';
            }

            continue;
        }

        if ($character === '"' || $character === "'") {
            $quote = $character;
            continue;
        }

        if ($character === '{') {
            $depth++;
            continue;
        }

        if ($character === '}') {
            $depth--;

            if ($depth === 0) {
                return substr(
                    $source,
                    $start,
                    $index - $start + 1
                );
            }
        }
    }

    return '';
}

function extractObjectString(
    string $source,
    string $objectName,
    string $key
): string {
    $object = extractObjectLiteral(
        $source,
        $objectName
    );

    if ($object === '') {
        return '';
    }

    $pattern = '/\b' .
        preg_quote($key, '/') .
        '\s*:\s*(["\'])(.*?)\1/s';

    if (preg_match($pattern, $object, $match) !== 1) {
        return '';
    }

    $value = $match[2];

    $decoded = json_decode(
        '"' .
            str_replace(
                ['\\\'', '"'],
                ["'", '\\"'],
                $value
            ) .
            '"',
        true
    );

    if (is_string($decoded)) {
        return trim($decoded);
    }

    return trim(stripcslashes($value));
}

function loadSiteConfiguration(): array
{
    $defaults = [
        'brandName' => 'Growwise Urban',
        'legalName' => 'Growwise Urban Media LLC',
        'email' => 'hello@growwiseurban.com'
    ];

    $configPath = __DIR__ .
        DIRECTORY_SEPARATOR .
        'config' .
        DIRECTORY_SEPARATOR .
        'config.js';

    if (!is_file($configPath) || !is_readable($configPath)) {
        return $defaults;
    }

    $source = file_get_contents($configPath);

    if (!is_string($source) || $source === '') {
        return $defaults;
    }

    $brandName = extractObjectString(
        $source,
        'brand',
        'name'
    );

    $legalName = extractObjectString(
        $source,
        'company',
        'legalName'
    );

    $email = extractObjectString(
        $source,
        'company',
        'email'
    );

    if ($brandName !== '') {
        $defaults['brandName'] = $brandName;
    }

    if ($legalName !== '') {
        $defaults['legalName'] = $legalName;
    }

    if (
        filter_var(
            $email,
            FILTER_VALIDATE_EMAIL
        ) !== false
    ) {
        $defaults['email'] = $email;
    }

    return $defaults;
}

function clientIdentifier(): string
{
    $address = (string) (
        $_SERVER['REMOTE_ADDR'] ?? 'unknown'
    );

    return hash(
        'sha256',
        $address .
            '|' .
            __FILE__
    );
}

function enforceRateLimit(): void
{
    $directory = sys_get_temp_dir();

    if (
        !is_string($directory) ||
        $directory === '' ||
        !is_dir($directory) ||
        !is_writable($directory)
    ) {
        return;
    }

    $path = $directory .
        DIRECTORY_SEPARATOR .
        'growwise-contact-' .
        clientIdentifier() .
        '.lock';

    $handle = @fopen($path, 'c+');

    if ($handle === false) {
        return;
    }

    try {
        if (!flock($handle, LOCK_EX)) {
            return;
        }

        rewind($handle);
        $stored = stream_get_contents($handle);
        $lastRequest = is_string($stored)
            ? (int) trim($stored)
            : 0;

        $now = time();

        if (
            $lastRequest > 0 &&
            ($now - $lastRequest) < RATE_LIMIT_SECONDS
        ) {
            respond(
                429,
                false,
                'Please wait a moment before sending another message.'
            );
        }

        rewind($handle);
        ftruncate($handle, 0);
        fwrite($handle, (string) $now);
        fflush($handle);
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}

function mailDomain(): string
{
    $host = strtolower(
        (string) ($_SERVER['HTTP_HOST'] ?? '')
    );

    $host = preg_replace('/:\d+$/', '', $host) ?? '';
    $host = preg_replace('/^www\./', '', $host) ?? '';

    if (
        filter_var(
            $host,
            FILTER_VALIDATE_DOMAIN,
            FILTER_FLAG_HOSTNAME
        ) === false
    ) {
        return 'growwiseurban.com';
    }

    return $host;
}

function encodeSubject(string $subject): string
{
    if (function_exists('mb_encode_mimeheader')) {
        return mb_encode_mimeheader(
            $subject,
            'UTF-8',
            'B',
            "\r\n"
        );
    }

    return '=?UTF-8?B?' .
        base64_encode($subject) .
        '?=';
}

function safeSourcePage(string $sourcePage): string
{
    if ($sourcePage === '') {
        return 'Not provided';
    }

    if (stringLength($sourcePage) > 250) {
        $sourcePage = function_exists('mb_substr')
            ? mb_substr(
                $sourcePage,
                0,
                250,
                'UTF-8'
            )
            : substr($sourcePage, 0, 250);
    }

    return singleLine($sourcePage);
}

if (
    strtoupper(
        (string) ($_SERVER['REQUEST_METHOD'] ?? '')
    ) !== 'POST'
) {
    header('Allow: POST');

    respond(
        405,
        false,
        'This endpoint accepts contact-form submissions by POST only.'
    );
}

$contentLength = (int) (
    $_SERVER['CONTENT_LENGTH'] ?? 0
);

if ($contentLength > MAX_REQUEST_BYTES) {
    respond(
        413,
        false,
        'Your request is too large. Please shorten the message and try again.'
    );
}

$data = readRequestData();

$honeypot = singleLine(
    requestField($data, 'company')
);

if ($honeypot !== '') {
    respond(
        200,
        true,
        'Thank you. Your message has been received.'
    );
}

enforceRateLimit();

$fullName = singleLine(
    requestField($data, 'fullName')
);

$email = singleLine(
    requestField($data, 'email')
);

$phone = singleLine(
    requestField($data, 'phone')
);

$service = singleLine(
    requestField($data, 'service')
);

$message = requestField(
    $data,
    'message'
);

$sourcePage = safeSourcePage(
    requestField($data, 'sourcePage')
);

$privacyConsent = truthyValue(
    $data['privacyConsent'] ?? false
);

if (
    stringLength($fullName) < 2 ||
    stringLength($fullName) > 120
) {
    respond(
        422,
        false,
        'Please enter a valid full name.'
    );
}

if (
    stringLength($email) > 190 ||
    filter_var(
        $email,
        FILTER_VALIDATE_EMAIL
    ) === false
) {
    respond(
        422,
        false,
        'Please enter a valid email address.'
    );
}

if (stringLength($phone) > 50) {
    respond(
        422,
        false,
        'Please enter a shorter telephone number.'
    );
}

if (stringLength($service) > 120) {
    respond(
        422,
        false,
        'Please select a valid growing topic.'
    );
}

$messageLength = stringLength($message);

if (
    $messageLength < MIN_MESSAGE_LENGTH ||
    $messageLength > MAX_MESSAGE_LENGTH
) {
    respond(
        422,
        false,
        'Please enter a message between 10 and 5,000 characters.'
    );
}

if (!$privacyConsent) {
    respond(
        422,
        false,
        'Please confirm that you have reviewed the Privacy Policy.'
    );
}

$config = loadSiteConfiguration();
$recipient = $config['email'];
$brandName = singleLine($config['brandName']);
$legalName = singleLine($config['legalName']);

if (
    filter_var(
        $recipient,
        FILTER_VALIDATE_EMAIL
    ) === false
) {
    respond(
        500,
        false,
        'The contact destination is not configured correctly.'
    );
}

$subjectTopic = $service !== ''
    ? $service
    : 'General inquiry';

$subject = sprintf(
    '%s website inquiry: %s',
    $brandName,
    $subjectTopic
);

$submittedAt = gmdate('Y-m-d H:i:s') . ' UTC';

$emailBody = implode(
    "\n",
    [
        'New website inquiry',
        '',
        'Brand: ' . $brandName,
        'Company: ' . $legalName,
        'Submitted: ' . $submittedAt,
        'Source page: ' . $sourcePage,
        '',
        'Full name: ' . $fullName,
        'Email: ' . $email,
        'Phone: ' . ($phone !== '' ? $phone : 'Not provided'),
        'Growing topic: ' . ($service !== '' ? $service : 'Not selected'),
        'Privacy consent: Confirmed',
        '',
        'Message:',
        $message
    ]
);

$domain = mailDomain();
$fromAddress = 'no-reply@' . $domain;

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'From: ' .
        $brandName .
        ' Website <' .
        $fromAddress .
        '>',
    'Reply-To: ' .
        $fullName .
        ' <' .
        $email .
        '>',
    'X-Mailer: PHP/' . PHP_VERSION
];

$sent = @mail(
    $recipient,
    encodeSubject($subject),
    $emailBody,
    implode("\r\n", $headers)
);

if (!$sent) {
    respond(
        500,
        false,
        'Your message could not be sent right now. Please email us directly at ' .
            $recipient .
            '.'
    );
}

respond(
    200,
    true,
    'Thank you. Your message has been sent successfully.'
);
