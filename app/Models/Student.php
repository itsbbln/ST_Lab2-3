<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Student extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_number', 'first_name', 'middle_name', 'last_name', 'suffix',
        'birth_date', 'email', 'contact_number', 'address', 'program_id',
        'year_level', 'status',
    ];

    protected function casts(): array
    {
        return ['birth_date' => 'date', 'year_level' => 'integer'];
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }
}
