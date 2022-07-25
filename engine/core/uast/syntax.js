
/*
    Copyright (C) 2022  Soheil Khodayari, CISPA
    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.
    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.


    Description:
    ------------
    UAST Synatx
    
    - Derived from the Joern Project
    - See: https://github.com/ShiftLeftSecurity/codepropertygraph/blob/master/schema/src/main/resources/schemas/base.json
*/




var UASTSyntax = {};


UASTSyntax.META_DATA            =  'META_DATA';
UASTSyntax.FILE                 = 'FILE';
UASTSyntax.METHOD               = 'METHOD';
UASTSyntax.METHOD_PARAMETER_IN  = 'METHOD_PARAMETER_IN';
UASTSyntax.METHOD_RETURN        = 'METHOD_RETURN';
UASTSyntax.MODIFIER             = 'MODIFIER';
UASTSyntax.TYPE                 = 'TYPE';
UASTSyntax.TYPE_DECL            = 'TYPE_DECL';
UASTSyntax.TYPE_PARAMETER       = 'TYPE_PARAMETER';
UASTSyntax.TYPE_ARGUMENT        = 'TYPE_ARGUMENT';
UASTSyntax.MEMBER               = 'MEMBER';
UASTSyntax.NAMESPACE_BLOCK      = 'NAMESPACE_BLOCK';
UASTSyntax.LITERAL              = 'LITERAL';
UASTSyntax.CALL                 = 'CALL';
UASTSyntax.LOCAL                = 'LOCAL';
UASTSyntax.IDENTIFIER           = 'IDENTIFIER';
UASTSyntax.FIELD_IDENTIFIER     = 'FIELD_IDENTIFIER';
UASTSyntax.RETURN               = 'RETURN';
UASTSyntax.BLOCK                = 'BLOCK';
UASTSyntax.METHOD_INST          = 'METHOD_INST';
UASTSyntax.ARRAY_INITIALIZER    = 'ARRAY_INITIALIZER';
UASTSyntax.METHOD_REF           = 'METHOD_REF';
UASTSyntax.TYPE_REF             = 'TYPE_REF';
UASTSyntax.CONTROL_STRUCTURE    = 'CONTROL_STRUCTURE';
UASTSyntax.JUMP_TARGET          = 'JUMP_TARGET';
UASTSyntax.UNKNOWN              = 'UNKNOWN';

UASTSyntax.op_addition          = '<operator>.addition';
UASTSyntax.op_subtraction       = '<operator>.subtraction';
UASTSyntax.op_multiplication    = '<operator>.multiplication';
UASTSyntax.op_division          = '<operator>.division';
UASTSyntax.op_exponentiation    = '<operator>.exponentiation';
UASTSyntax.op_modulo            = '<operator>.modulo';
UASTSyntax.op_shiftLeft         = '<operator>.shiftLeft';
UASTSyntax.op_logicalShiftRight         = '<operator>.logicalShiftRight';
UASTSyntax.op_arithmeticShiftRight      = '<operator>.arithmeticShiftRight';
UASTSyntax.op_not                       = '<operator>.not';
UASTSyntax.op_and                       = '<operator>.and';
UASTSyntax.op_or                        = '<operator>.or';
UASTSyntax.op_xor                       = '<operator>.xor';
UASTSyntax.op_assignmentPlus            = '<operator>.assignmentPlus';
UASTSyntax.op_assignmentMinus           = '<operator>.assignmentMinus';
UASTSyntax.op_assignmentMultiplication  = '<operator>.assignmentMultiplication';
UASTSyntax.op_assignmentDivision        = '<operator>.assignmentDivision';
UASTSyntax.op_assignmentExponentiation  = '<operators>.assignmentExponentiation';
UASTSyntax.op_assignmentModulo          = '<operators>.assignmentModulo';
UASTSyntax.op_assignmentShiftLeft       = '<operators>.assignmentShiftLeft';
UASTSyntax.op_assignmentLogicalShiftRight       = '<operators>.assignmentLogicalShiftRight';
UASTSyntax.op_assignmentArithmeticShiftRight    = '<operators>.assignmentArithmeticShiftRight';
UASTSyntax.op_assignmentAnd                     = '<operators>.assignmentAnd';
UASTSyntax.op_assignmentOr         = '<operators>.assignmentOr';
UASTSyntax.op_assignmentXor        = '<operators>.assignmentXor';
UASTSyntax.op_assignment           = '<operator>.assignment';
UASTSyntax.op_minus                = '<operator>.minus';
UASTSyntax.op_plus                 = '<operator>.plus';
UASTSyntax.op_preIncrement         = '<operator>.preIncrement';
UASTSyntax.op_preDecrement         = '<operator>.preDecrement';
UASTSyntax.op_postIncrement        = '<operator>.postIncrement';
UASTSyntax.op_postDecrement        = '<operator>.postDecrement';
UASTSyntax.op_logicalNot                   = '<operator>.logicalNot';
UASTSyntax.op_logicalOr                    = '<operator>.logicalOr';
UASTSyntax.op_logicalAnd                   = '<operator>.logicalAnd';
UASTSyntax.op_equals                       = '<operator>.equals';
UASTSyntax.op_notEquals                    = '<operator>.notEquals';
UASTSyntax.op_greaterThan                  = '<operator>.greaterThan';
UASTSyntax.op_lessThan                     = '<operator>.lessThan';
UASTSyntax.op_greaterEqualsThan            = '<operator>.greaterEqualsThan';
UASTSyntax.op_lessEqualsThan               = '<operator>.lessEqualsThan';
UASTSyntax.op_instanceOf                   = '<operator>.instanceOf';
UASTSyntax.op_memberAccess                 = '<operator>.memberAccess';
UASTSyntax.op_indirectMemberAccess         = '<operator>.indirectMemberAccess';
UASTSyntax.op_computedMemberAccess         = '<operator>.computedMemberAccess';
UASTSyntax.op_indirectComputedMemberAccess = '<operator>.indirectComputedMemberAccess';
UASTSyntax.op_indirection           = '<operator>.indirection';
UASTSyntax.op_delete                = '<operator>.delete';
UASTSyntax.op_conditional           = '<operator>.conditional';
UASTSyntax.op_cast                  = '<operator>.cast';
UASTSyntax.op_compare               = '<operator>.compare';
UASTSyntax.op_addressOf             = '<operator>.addressOf';
UASTSyntax.op_sizeOf                = '<operator>.sizeOf';
UASTSyntax.op_fieldAccess           = '<operator>.fieldAccess';
UASTSyntax.op_indirectFieldAccess   = '<operator>.indirectFieldAccess';
UASTSyntax.op_indexAccess           = '<operator>.indexAccess';
UASTSyntax.op_indirectIndexAccess   = '<operator>.indirectIndexAccess';
UASTSyntax.op_pointerShift          = '<operator>.pointerShift';
UASTSyntax.op_getElementPtr         = '<operator>.getElementPtr';


module.exports = UASTSyntax;