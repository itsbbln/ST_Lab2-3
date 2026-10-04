<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Grade extends Model
{
    use HasFactory;

    protected $fillable = ['enrollment_id', 'midterm_grade', 'final_grade', 'remarks'];

    protected function casts(): array
    {
        return ['midterm_grade' => 'decimal:2', 'final_grade' => 'decimal:2'];
    }

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class);
    }
}
