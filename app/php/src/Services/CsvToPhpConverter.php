<?php

declare(strict_types=1);

namespace App\Services;

final class CsvToPhpConverter
{
    public function __construct(
        private readonly string $delimiter = ',',
        private readonly string $enclosure = '"',
        private readonly string $escape = ''
    ) {
        if (mb_strlen($delimiter, '8bit') !== 1) {
            throw new \InvalidArgumentException('Delimiter must be a single byte.');
        }

        if (mb_strlen($enclosure, '8bit') !== 1) {
            throw new \InvalidArgumentException('Enclosure must be a single byte.');
        }

        if ($escape !== '' && mb_strlen($escape, '8bit') !== 1) {
            throw new \InvalidArgumentException('Escape must be a single byte or an empty string.');
        }
    }

    public function convertFile(string $filePath, bool $useHeader = true): array
    {
        if (!is_file($filePath) || !is_readable($filePath)) {
            throw new \InvalidArgumentException("File not found or unreadable: {$filePath}");
        }

        $handle = fopen($filePath, 'rb');

        if ($handle === false) {
            throw new \RuntimeException("Unable to open file: {$filePath}");
        }

        try {
            $this->stripUtf8Bom($handle);
            return $this->parseHandle($handle, $useHeader);
        } finally {
            fclose($handle);
        }
    }

    public function convertString(string $csvString, bool $useHeader = true): array
    {
        $handle = fopen('php://temp', 'r+');

        if ($handle === false) {
            throw new \RuntimeException('Unable to open temporary memory stream.');
        }

        fwrite($handle, $csvString);
        rewind($handle);

        try {
            $this->stripUtf8Bom($handle);
            return $this->parseHandle($handle, $useHeader);
        } finally {
            fclose($handle);
        }
    }

    /**
     * @param resource $handle
     */
    private function parseHandle($handle, bool $useHeader): array
    {
        $data = [];
        $header = null;

        while (($row = fgetcsv(
            $handle,
            0,
            $this->delimiter,
            $this->enclosure,
            $this->escape
        )) !== false) {
            if ($this->isEmptyRow($row)) {
                continue;
            }

            if (!$useHeader) {
                $data[] = $row;
                continue;
            }

            if ($header === null) {
                $header = $this->normalizeHeader($row);
                continue;
            }

            $data[] = $this->mapRowToHeader($header, $row);
        }

        return $data;
    }

    /**
     * @param string[] $header
     * @param string[]|null[] $row
     * @return array<string, string|null>
     */
    private function mapRowToHeader(array $header, array $row): array
    {
        $headerCount = count($header);
        $rowCount = count($row);

        if ($rowCount < $headerCount) {
            $row = array_pad($row, $headerCount, '');
        } elseif ($rowCount > $headerCount) {
            $row = array_slice($row, 0, $headerCount);
        }

        return array_combine($header, $row);
    }

    /**
     * Ensures every header key is unique.
     *
     * @param string[] $header
     * @return string[]
     */
    private function normalizeHeader(array $header): array
    {
        $seen = [];
        $normalized = [];

        foreach ($header as $index => $name) {
            $name = trim((string) $name);

            if ($name === '') {
                $name = 'column_' . ($index + 1);
            }

            if (isset($seen[$name])) {
                $seen[$name]++;
                $name .= '_' . $seen[$name];
            } else {
                $seen[$name] = 0;
            }

            $normalized[$index] = $name;
        }

        return $normalized;
    }

    /**
     * @param string[]|null[] $row
     */
    private function isEmptyRow(array $row): bool
    {
        return count($row) === 1
            && ($row[0] === null || trim((string) $row[0]) === '');
    }

    /**
     * @param resource $handle
     */
    private function stripUtf8Bom($handle): void
    {
        $bom = fread($handle, 3);

        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }
    }
}